
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    onSnapshot,
    serverTimestamp,
    query,
    where,
    getDocs,
    limit,
    getDoc,
    deleteDoc,
    arrayUnion
} from "firebase/firestore";
import { webcrypto } from 'node:crypto';
import { TextEncoder, TextDecoder } from 'node:util';

// ─── Polyfills for Node Environment ──────────────────────────────────
if (typeof window === 'undefined') {
    (global as any).window = {
        crypto: webcrypto,
        btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
        atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
    };
    (global as any).TextEncoder = TextEncoder;
    (global as any).TextDecoder = TextDecoder;
}

// ─── Constants ───────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
};

const COLLECTIONS = {
    USERS: "users",
    CHATS: "chats",
    MESSAGES: "messages",
    MATCH_QUEUE: "matchQueue",
    REPORTS: "reports",
    CONNECTION_REQUESTS: "connectionRequests"
};

const NAMES = [
    "Bot_Alpha", "Bot_Bravo", "Bot_Charlie", "Bot_Delta", "Bot_Echo",
    "Bot_Foxtrot", "Bot_Golf", "Bot_Hotel", "Bot_India", "Bot_Juliet"
];

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Crypto Helpers (Mimicking src/lib/crypto.ts) ────────────────────
async function generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );
    const publicKey = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    const privateKey = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);
    return { publicKey, privateKey, rawPair: keyPair };
}

async function importPublicKey(jwk: any) {
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        []
    );
}

async function importPrivateKey(jwk: any) {
    return window.crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDH", namedCurve: "P-256" },
        true,
        ["deriveKey", "deriveBits"]
    );
}

async function deriveSharedKey(privateKey: CryptoKey, publicKey: CryptoKey) {
    return window.crypto.subtle.deriveKey(
        { name: "ECDH", public: publicKey },
        privateKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

async function encryptMessage(text: string, key: CryptoKey) {
    const encoded = new TextEncoder().encode(text);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encoded
    );
    return {
        iv: Buffer.from(iv).toString('base64'),
        ciphertext: Buffer.from(encrypted).toString('base64')
    };
}

async function decryptMessage(ivBase64: string, ciphertextBase64: string, key: CryptoKey) {
    const iv = Buffer.from(ivBase64, 'base64');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');
    const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        ciphertext
    );
    return new TextDecoder().decode(decrypted);
}

// ─── Simulated User Class ────────────────────────────────────────────
class SimulatedUser {
    app: any;
    auth: any;
    db: any;
    uid: string = "";
    name: string;

    // State
    chatId: string | null = null;
    partnerId: string | null = null;
    matchUnsub: (() => void) | null = null;
    chatUnsub: (() => void) | null = null;

    // E2EE
    keyPair: { publicKey: any, privateKey: any, rawPair: CryptoKeyPair } | null = null;
    sharedKeys = new Map<string, CryptoKey>();

    // Stats
    messagesSent = 0;
    messagesReceived = 0;

    logs: string[] = [];

    constructor(index: number, name: string) {
        this.name = name;
        this.app = initializeApp(firebaseConfig, `User_${index}_${Date.now()}`);
        this.auth = getAuth(this.app);
        this.db = getFirestore(this.app);
    }

    log(msg: string) {
        // const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
        // console.log(`[${timestamp}] [${this.name}] ${msg}`);
        // Quieter logs for mass test
        this.logs.push(msg);
        console.log(`[${this.name}] ${msg}`);
    }

    async init() {
        // 1. Auth
        const cred = await signInAnonymously(this.auth);
        this.uid = cred.user.uid;

        // 2. Generate E2EE Keys
        this.keyPair = await generateKeyPair();

        // 3. Create/Update Profile
        const userRef = doc(this.db, COLLECTIONS.USERS, this.uid);
        await setDoc(userRef, {
            userId: this.uid,
            displayName: this.name,
            displayNameLower: this.name.toLowerCase(),
            isAnonymous: true,
            isBlocked: false,
            violationCount: 0,
            blockedUsers: [],
            publicKey: this.keyPair.publicKey, // Store Public Key!
            createdAt: serverTimestamp(),
            lastActiveAt: serverTimestamp(),
        });

        this.log("Initialized & Keys Generated");
    }

    async joinQueue() {
        this.log("Joining Match Queue...");

        // Cleanup old listeners
        if (this.matchUnsub) { this.matchUnsub(); this.matchUnsub = null; }
        if (this.chatUnsub) { this.chatUnsub(); this.chatUnsub = null; }
        this.chatId = null;
        this.partnerId = null;

        const queueRef = doc(collection(this.db, COLLECTIONS.MATCH_QUEUE));
        const myQueueId = queueRef.id;

        // 1. Try to find a match
        const match = await this.findMatch() as { id: string, userId: string } | null;

        if (match) {
            this.log(`Found match: ${match.userId}`);
            try {
                // Determine Chat ID (new doc)
                const newChatId = doc(collection(this.db, COLLECTIONS.CHATS)).id;

                // Create Chat
                await setDoc(doc(this.db, COLLECTIONS.CHATS, newChatId), {
                    participants: [this.uid, match.userId],
                    status: "active",
                    createdAt: serverTimestamp(),
                    messageCount: 0
                });

                // Update Match Doc
                await updateDoc(doc(this.db, COLLECTIONS.MATCH_QUEUE, match.id), {
                    status: "matched",
                    matchedWith: this.uid,
                    chatId: newChatId
                });

                // Set My Queue Doc (Matched)
                await setDoc(queueRef, {
                    userId: this.uid,
                    status: "matched",
                    matchedWith: match.userId,
                    chatId: newChatId,
                    createdAt: serverTimestamp()
                });

                this.setupChat(newChatId, match.userId);
                return;

            } catch (e) {
                this.log("Match attempt failed, falling back to waiting.");
            }
        }

        // 2. Wait
        await setDoc(queueRef, {
            userId: this.uid,
            status: "waiting",
            createdAt: serverTimestamp(),
            matchedWith: null,
            chatId: null
        });

        // Listen for match (Non-blocking)
        console.log(`[${this.name}] Waiting for match...`);
        this.matchUnsub = onSnapshot(queueRef, (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            if (data.status === "matched" && data.chatId && data.matchedWith) {
                this.log(`Was matched by ${data.matchedWith}`);
                if (this.matchUnsub) { this.matchUnsub(); this.matchUnsub = null; }
                this.setupChat(data.chatId, data.matchedWith);
            }
        });
    }

    async findMatch() {
        try {
            while (true) {
                const q = query(
                    collection(this.db, COLLECTIONS.MATCH_QUEUE),
                    where("status", "==", "waiting"),
                    limit(10)
                );
                const snap = await getDocs(q);
                const others = snap.docs.filter(d => d.data().userId !== this.uid);

                if (others.length === 0) return null;

                for (const docSnap of others) {
                    const data = docSnap.data();

                    // Ghost Check
                    // Fetch user profile to check liveness
                    const userRef = doc(this.db, COLLECTIONS.USERS, data.userId);
                    const userSnap = await getDoc(userRef);

                    let isGhost = false;
                    if (!userSnap.exists()) {
                        isGhost = true;
                    } else {
                        const userData = userSnap.data();
                        const lastActive = userData?.lastActiveAt;
                        if (lastActive) {
                            const lastActiveMillis = typeof lastActive.toMillis === 'function' ? lastActive.toMillis() : (lastActive.seconds * 1000); // Handle Timestamp or serialized
                            if (Date.now() - lastActiveMillis > 5 * 60 * 1000) { // 5 mins
                                isGhost = true;
                            }
                        } else {
                            // No lastActive, check queue creation time
                            const createdAtMillis = typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : Date.now();
                            if (Date.now() - createdAtMillis > 10 * 60 * 1000) {
                                isGhost = true;
                            }
                        }
                    }

                    if (isGhost) {
                        this.log(`Found ghost ${data.userId}, cleaning up...`);
                        await deleteDoc(doc(this.db, COLLECTIONS.MATCH_QUEUE, docSnap.id)).catch(() => { });
                        continue; // Check next
                    }

                    // Found valid match
                    return { id: docSnap.id, ...data };
                }

                // If we loop through all 10 and all were ghosts/self, we loop outer while to fetch more?
                // Or just return null and let query implementation handle logic (which usually retries or waits).
                // Simplification: returns null if no valid match in top 10.
                return null;
            }
        } catch (e: any) {
            this.log(`findMatch Error: ${e.code} ${e.message}`);
            throw e;
        }
    }

    async setupChat(chatId: string, partnerId: string) {
        this.chatId = chatId;
        this.partnerId = partnerId;
        this.log(`Entering Chat ${chatId} with ${partnerId}`);

        // 1. Establish Shared Key
        await this.establishSharedKey(partnerId);

        // 2. Listen to Messages
        this.chatUnsub = onSnapshot(collection(this.db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    if (data.senderId !== this.uid) { // Incoming
                        this.messagesReceived++;
                        if (data.type === "encrypted" && data.iv) {
                            // Decrypt
                            try {
                                const key = this.sharedKeys.get(partnerId);
                                if (key) {
                                    const text = await decryptMessage(data.iv, data.content, key);
                                    // this.log(`Received (Decrypted): "${text}"`);
                                } else {
                                    this.log(`Received Encrypted (No Key): "${data.content.slice(0, 10)}..."`);
                                }
                            } catch (e) {
                                this.log("Decryption Error");
                            }
                        } else {
                            // Plaintext
                            // this.log(`Received: "${data.content}"`);
                        }
                    }
                }
            });
        });
    }

    async establishSharedKey(partnerId: string) {
        if (!this.keyPair) return;

        // Fetch partner public key
        const userDoc = await getDoc(doc(this.db, COLLECTIONS.USERS, partnerId));
        if (!userDoc.exists()) return;

        const data = userDoc.data();
        if (data.publicKey) {
            const partnerKey = await importPublicKey(data.publicKey);
            const myPrivateKey = this.keyPair.rawPair.privateKey; // Use raw object for webcrypto
            const shared = await deriveSharedKey(myPrivateKey, partnerKey);
            this.sharedKeys.set(partnerId, shared);
            this.log("Shared Secret Established 🔐");
        } else {
            this.log("Partner has no Public Key (Plaintext fallback)");
        }
    }

    async sendMessage(text: string) {
        if (!this.chatId || !this.partnerId) return;

        let content = text;
        let type = "text";
        let iv = null;

        // Encrypt if possible
        const key = this.sharedKeys.get(this.partnerId);
        if (key) {
            const encrypted = await encryptMessage(text, key);
            content = encrypted.ciphertext;
            iv = encrypted.iv;
            type = "encrypted";
        }

        await addDoc(collection(this.db, COLLECTIONS.CHATS, this.chatId, COLLECTIONS.MESSAGES), {
            senderId: this.uid,
            receiverId: this.partnerId,
            content,
            type,
            iv,
            createdAt: serverTimestamp(),
            moderationStatus: "approved"
        });

        await updateDoc(doc(this.db, COLLECTIONS.CHATS, this.chatId), { lastMessageAt: serverTimestamp() });
        this.messagesSent++;
        // this.log(`Sent: "${text}"`);
    }

    async disconnect() {
        if (!this.chatId) return;
        this.log("Disconnecting/Ending Chat...");
        await updateDoc(doc(this.db, COLLECTIONS.CHATS, this.chatId), { status: "ended" });
        this.chatId = null;
        this.partnerId = null;
        if (this.chatUnsub) { this.chatUnsub(); this.chatUnsub = null; }
    }

    async reportPartner() {
        if (!this.partnerId || !this.chatId) return;
        this.log(`Reporting ${this.partnerId}...`);
        await addDoc(collection(this.db, COLLECTIONS.REPORTS), {
            reporterId: this.uid,
            reportedUserId: this.partnerId,
            chatId: this.chatId,
            reason: "spam",
            createdAt: serverTimestamp()
        });
    }

    async blockPartner() {
        if (!this.partnerId) return;
        this.log(`Blocking ${this.partnerId}...`);
        await updateDoc(doc(this.db, COLLECTIONS.USERS, this.uid), {
            blockedUsers: arrayUnion(this.partnerId)
        });
        await this.disconnect();
    }

    async sendConnectionRequest() {
        if (!this.partnerId || !this.chatId) return;
        this.log(`Sending Connection Request to ${this.partnerId}...`);
        await addDoc(collection(this.db, COLLECTIONS.CONNECTION_REQUESTS), {
            fromUserId: this.uid,
            toUserId: this.partnerId,
            chatId: this.chatId,
            status: "pending",
            createdAt: serverTimestamp()
        });
    }

    async cleanup() {
        if (this.matchUnsub) this.matchUnsub();
        if (this.chatUnsub) this.chatUnsub();
        await deleteApp(this.app);
    }
}

// ─── Verification Report Data ──────────────────────────────────────
const reportData = {
    matchesFormed: 0,
    messagesExchanged: 0,
    reportsFiled: 0,
    blocksEnforced: 0,
    connectionsRequested: 0,
    errors: [] as string[]
};

// ─── Main Logic ────────────────────────────────────────────────────
async function runFullFlowTest() {
    console.log(`\n🤖 Starting Full System Flow Test with ${NAMES.length} Bots 🤖\n`);

    const bots = NAMES.map((name, i) => new SimulatedUser(i, name));

    try {
        // 1. Initialize
        console.log("--- Phase 1: Initialization & Key Gen ---");
        await Promise.all(bots.map(b => b.init()));

        // 2. Matching
        console.log("\n--- Phase 2: Matching (Sequential to avoid race conditions) ---");
        // Serial Join
        for (const b of bots) {
            try {
                await b.joinQueue();
            } catch (e: any) {
                console.error(`[${b.name}] Join Queue Failed:`, e.code, e.message);
                throw e;
            }
            await delay(500); // Small delay between joins
        }

        // Wait for matches to settle
        await delay(5000);

        const matchedBots = bots.filter(b => b.chatId !== null);
        console.log(`Matched Bots: ${matchedBots.length}/${bots.length}`);
        reportData.matchesFormed = matchedBots.length / 2; // Pairs

        if (matchedBots.length < 2) {
            throw new Error("Not enough matches to continue testing");
        }

        // 3. Encrypted Messaging
        console.log("\n--- Phase 3: E2EE Messaging ---");
        for (const bot of matchedBots) {
            await bot.sendMessage(`Greetings from ${bot.name} (Secured)`);
            await delay(200);
        }
        await delay(2000); // Allow delivery

        // 4. Scenarios
        console.log("\n--- Phase 4: Scenarios ---");

        // Pair 1: Bot 0 & Bot 1 -> Simple Disconnect
        // Bot 0 Disconnects, Bot 1 should see "ended" (simulated by logic checking status, but here we just verify flow)
        if (bots[0].chatId && bots[0].partnerId === bots[1].uid) {
            await bots[0].disconnect();
            // Bot 1 should ideally rejoin queue automatically in real app, here we just simulate the event
            console.log("Scenario 1: Disconnect Flow Complete");
        }

        // Pair 2: Bot 2 & Bot 3 -> Report
        if (bots[2].chatId) {
            await bots[2].reportPartner();
            reportData.reportsFiled++;
            console.log("Scenario 2: Report Flow Complete");
        }

        // Pair 3: Bot 4 & Bot 5 -> Block
        if (bots[4].chatId) {
            await bots[4].blockPartner();
            reportData.blocksEnforced++;
            console.log("Scenario 3: Block Flow Complete");
        }

        // Pair 4: Bot 6 & Bot 7 -> Connection Request
        if (bots[6].chatId) {
            await bots[6].sendConnectionRequest();
            reportData.connectionsRequested++;
            console.log("Scenario 4: Connection Request Flow Complete");
        }

        // Pair 5: Bot 8 & Bot 9 -> Long Chat
        if (bots[8].chatId) {
            for (let i = 0; i < 3; i++) {
                await bots[8].sendMessage(`Message ${i}`);
                await bots[9].sendMessage(`Reply ${i}`);
                await delay(500);
            }
        }

        // 5. Wrap Up
        await delay(2000);
        console.log("\n--- Phase 5: Stats & Cleanup ---");

        const totalSent = bots.reduce((sum, b) => sum + b.messagesSent, 0);
        const totalRecv = bots.reduce((sum, b) => sum + b.messagesReceived, 0);

        reportData.messagesExchanged = totalSent;

        console.log("-----------------------------------------");
        console.log(`Total Messages Sent: ${totalSent}`);
        console.log(`Total Messages Recv: ${totalRecv}`);
        console.log(`Reports: ${reportData.reportsFiled}`);
        console.log(`Blocks: ${reportData.blocksEnforced}`);
        console.log(`Connections: ${reportData.connectionsRequested}`);
        console.log("-----------------------------------------");

    } catch (e: any) {
        console.error("Critical Test Failure:", e);
        reportData.errors.push(e.message);
    } finally {
        for (const bot of bots) await bot.cleanup();
    }
}

runFullFlowTest();
