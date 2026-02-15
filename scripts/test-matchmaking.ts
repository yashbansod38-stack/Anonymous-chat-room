
import { initializeApp, deleteApp, type FirebaseApp } from "firebase/app";
import {
    getAuth,
    signInAnonymously,
    connectAuthEmulator,
    type Auth
} from "firebase/auth";
import {
    getFirestore,
    connectFirestoreEmulator,
    doc,
    setDoc,
    addDoc,
    collection,
    onSnapshot,
    query,
    where,
    getDocs,
    limit,
    runTransaction,
    serverTimestamp,
    type Firestore
} from "firebase/firestore";

// --- Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
    measurementId: "G-9E9YESX5QE"
};

// --- Helpers ---
const COLLECTIONS = {
    USERS: "users",
    CHATS: "chats",
    MATCH_QUEUE: "matchQueue",
};

async function createUserProfile(db: Firestore, userId: string, name: string) {
    await setDoc(doc(db, COLLECTIONS.USERS, userId), {
        userId,
        displayName: name,
        displayNameLower: name.toLowerCase(),
        isAnonymous: true,
        isBlocked: false,
        violationCount: 0,
        blockedUsers: [],
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
    });
    console.log(`[${name}] Profile created.`);
}

async function joinQueue(db: Firestore, userId: string) {
    const queueRef = collection(db, COLLECTIONS.MATCH_QUEUE);
    const docRef = await addDoc(queueRef, {
        userId,
        createdAt: serverTimestamp(),
    });
    console.log(`[User ${userId.slice(0, 4)}] Joined queue with doc ID: ${docRef.id}`);
    return docRef.id;
}

// Re-implement simplified matching logic for the test
async function findMatch(db: Firestore, myUserId: string, myQueueDocId: string) {
    // 1. Look for other users in queue
    const q = query(
        collection(db, COLLECTIONS.MATCH_QUEUE),
        where("userId", "!=", myUserId),
        limit(10) // Just grab some
    );
    const snapshot = await getDocs(q);

    for (const otherDoc of snapshot.docs) {
        const otherData = otherDoc.data();
        const otherUserId = otherData.userId;

        // Try to claim this match
        try {
            const chatId = await runTransaction(db, async (transaction) => {
                const otherQueueRef = doc(db, COLLECTIONS.MATCH_QUEUE, otherDoc.id);
                const myQueueRef = doc(db, COLLECTIONS.MATCH_QUEUE, myQueueDocId);

                const otherQueueSnap = await transaction.get(otherQueueRef);
                if (!otherQueueSnap.exists()) throw new Error("MATCH_TAKEN");

                // Create chat
                const chatRef = doc(collection(db, COLLECTIONS.CHATS));
                transaction.set(chatRef, {
                    participants: [myUserId, otherUserId],
                    createdAt: serverTimestamp(),
                    active: true,
                    lastMessageAt: serverTimestamp(),
                    messageCount: 0,
                });

                // Delete both queue entries
                transaction.delete(otherQueueRef);
                transaction.delete(myQueueRef);

                return chatRef.id;
            });
            return chatId;
        } catch (e) {
            console.log("Failed to claim match, trying next...", e);
        }
    }
    return null;
}

// --- Main Test ---
async function runTest() {
    console.log("Starting scaled matchmaking test (8 users)...");

    const NUM_USERS = 8;
    const apps: FirebaseApp[] = [];

    try {
        const promises = [];

        for (let i = 0; i < NUM_USERS; i++) {
            promises.push((async () => {
                const appName = `User_${i}`;
                const app = initializeApp(firebaseConfig, appName);
                apps.push(app);

                const auth = getAuth(app);
                const db = getFirestore(app);

                // Auth
                const cred = await signInAnonymously(auth);
                const uid = cred.user.uid;
                const name = `Bot_${i}_${Math.random().toString(36).substring(7)}`;

                // Profile
                await createUserProfile(db, uid, name);

                // Join Queue
                console.log(`[${name}] Joining queue...`);
                const qDoc = await joinQueue(db, uid);

                // Wait randomly to simulate real traffic
                await new Promise(r => setTimeout(r, Math.random() * 2000));

                // Find Match
                console.log(`[${name}] Looking for match...`);
                let attempts = 0;
                let chatId = null;

                while (attempts < 5 && !chatId) {
                    chatId = await findMatch(db, uid, qDoc);
                    if (chatId) break;
                    await new Promise(r => setTimeout(r, 1000));
                    attempts++;
                }

                if (chatId) {
                    console.log(`✅ [${name}] Matched in Chat: ${chatId}`);
                } else {
                    console.log(`⚠️ [${name}] No match found after attempts.`);
                }
            })());
        }

        await Promise.all(promises);
        console.log("Test run complete.");

    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        for (const app of apps) {
            await deleteApp(app);
        }
        process.exit(0);
    }
}

runTest();
