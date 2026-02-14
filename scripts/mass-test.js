
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signInAnonymously } = require("firebase/auth");
const { getFirestore, doc, setDoc, onSnapshot, collection, addDoc, updateDoc, query, where, getDocs, runTransaction, serverTimestamp, orderBy, limit } = require("firebase/firestore");

// Hardcoded config
const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
};

// Simulation Config
const NUM_BOTS = 8;

// Helper to sleep
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// --- Matchmaking Logic (Replicated from src/lib/matchmaking.ts) ---

async function findMatch(db, userId) {
    const q = query(
        collection(db, "matchQueue"),
        where("status", "==", "waiting"),
        orderBy("createdAt", "asc"),
        limit(10)
    );
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data.userId === userId) continue; // Skip self
        return { id: docSnap.id, ...data };
    }
    return null;
}

async function joinMatchQueue(db, userId) {
    const queueRef = doc(collection(db, "matchQueue"));
    const docId = queueRef.id;

    // 1. Look for match
    const match = await findMatch(db, userId);

    if (match) {
        try {
            const chatId = await runTransaction(db, async (transaction) => {
                const matchRef = doc(db, "matchQueue", match.id);
                const matchSnap = await transaction.get(matchRef);

                if (!matchSnap.exists() || matchSnap.data().status !== "waiting") {
                    throw new Error("MATCH_TAKEN");
                }

                // Create Chat
                const chatRef = doc(collection(db, "chats"));
                transaction.set(chatRef, {
                    participants: [userId, match.userId],
                    status: "active",
                    createdAt: serverTimestamp(),
                    lastMessageAt: serverTimestamp(),
                    messageCount: 0
                });

                // Update their queue
                transaction.update(matchRef, {
                    status: "matched",
                    matchedWith: userId,
                    chatId: chatRef.id
                });

                // Set our queue
                transaction.set(queueRef, {
                    userId,
                    status: "matched",
                    createdAt: serverTimestamp(),
                    matchedWith: match.userId,
                    chatId: chatRef.id
                });

                return chatRef.id;
            });
            return { result: "MATCHED", chatId };
        } catch (e) {
            if (e.message === "MATCH_TAKEN") {
                console.log("Match taken, retrying...");
                return joinMatchQueue(db, userId); // Retry
            }
            throw e;
        }
    } else {
        // No match, wait
        await setDoc(queueRef, {
            userId,
            status: "waiting",
            createdAt: serverTimestamp(),
            matchedWith: null,
            chatId: null
        });
        return { result: "WAITING", docId };
    }
}

// --- Bot Logic ---

async function createBot(index) {
    const appName = `BotApp_${index}`;
    const app = initializeApp(firebaseConfig, appName);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const botName = `AutoBot_${index}_${Date.now().toString().slice(-4)}`;
    const email = `${botName.toLowerCase()}@anon.chat`;
    const password = "botpassword123";

    console.log(`[${botName}] 🚀 Starting...`);

    let user;
    try {
        await signInWithEmailAndPassword(auth, email, password).catch(async () => {
            console.log(`[${botName}] Creating account...`);
            await createUserWithEmailAndPassword(auth, email, password);
        });
        user = auth.currentUser;
        console.log(`[${botName}] Auth success.`);
    } catch (e) {
        console.error(`[${botName}] Auth failed:`, e.code);
        return null;
    }

    // Set Profile
    await setDoc(doc(db, "users", user.uid), {
        userId: user.uid,
        displayName: botName,
        email: email,
        lastActiveAt: new Date(),
        isBlocked: false,
        violationCount: 0
    }, { merge: true });

    // Listen for Chats (to detect match success)
    const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));

    // Track stats
    let matchesFound = 0;

    onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
                const chatData = change.doc.data();
                // Check if recent
                const createdTime = chatData.createdAt?.toDate ? chatData.createdAt.toDate().getTime() : Date.now();
                if (Date.now() - createdTime < 60000) {
                    matchesFound++;
                    console.log(`[${botName}] 🎉 MATCHED! Chat ID: ${change.doc.id}`);

                    // Send Message
                    try {
                        await addDoc(collection(db, "chats", change.doc.id, "messages"), {
                            text: `Hello from ${botName}!`,
                            senderId: user.uid,
                            createdAt: new Date(),
                            type: "text"
                        });
                        console.log(`[${botName}] 💬 Message sent.`);
                    } catch (e) { console.error(e.message); }
                }
            }
        });
    });

    // START MATCHMAKING
    console.log(`[${botName}] Joining Queue...`);
    const qResult = await joinMatchQueue(db, user.uid);
    console.log(`[${botName}] Queue Result: ${qResult.result}`);

    return { app, botName };
}

async function runTest() {
    console.log(`Starting Interactive Load Test with ${NUM_BOTS} bots...`);

    const bots = [];
    for (let i = 0; i < NUM_BOTS; i++) {
        const bot = await createBot(i);
        if (bot) bots.push(bot);
        await sleep(2000); // Stagger to allow some to wait and some to match
    }

    console.log("All bots running. Waiting 60s...");
    await sleep(60000);

    console.log("Test Complete. Shutting down...");
    process.exit(0);
}

runTest();
