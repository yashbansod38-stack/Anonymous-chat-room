
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
    console.log("Starting matchmaking test...");

    // Initialize two separate apps to simulate two clients
    const app1 = initializeApp(firebaseConfig, "UserA");
    const app2 = initializeApp(firebaseConfig, "UserB");

    const auth1 = getAuth(app1);
    const auth2 = getAuth(app2);

    const db1 = getFirestore(app1);
    const db2 = getFirestore(app2);

    try {
        // Authenticate
        console.log("Authenticating users...");
        const cred1 = await signInAnonymously(auth1);
        const cred2 = await signInAnonymously(auth2);

        const uid1 = cred1.user.uid;
        const uid2 = cred2.user.uid;

        console.log(`User A: ${uid1}`);
        console.log(`User B: ${uid2}`);

        // Create Profiles (Onboarding)
        await createUserProfile(db1, uid1, "TestUserA");
        await createUserProfile(db2, uid2, "TestUserB");

        // User A joins the queue
        const qDoc1 = await joinQueue(db1, uid1);

        // Wait a bit
        await new Promise(r => setTimeout(r, 1000));

        // User B joins the queue
        const qDoc2 = await joinQueue(db2, uid2);

        // Simulating the Client B finding a match (since B joined last and sees A waiting)
        console.log("User B looking for match...");
        let chatId = await findMatch(db2, uid2, qDoc2);

        if (chatId) {
            console.log(`✅ MATCH FOUND! Chat ID: ${chatId}`);
        } else {
            console.log("❌ No match found immediately for User B. Trying User A...");
            // Maybe A finds B if timing was different
            chatId = await findMatch(db1, uid1, qDoc1);
            if (chatId) console.log(`✅ MATCH FOUND! Chat ID: ${chatId}`);
        }

        if (!chatId) {
            console.error("FAILED to simulate a match.");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        await deleteApp(app1);
        await deleteApp(app2);
        // Force exit because Firestore listeners might hang
        process.exit(0);
    }
}

runTest();
