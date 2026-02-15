
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    arrayUnion
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
    measurementId: "G-9E9YESX5QE"
};

const COLLECTIONS = {
    USERS: "users",
    CHATS: "chats",
    MESSAGES: "messages",
    REPORTS: "reports"
};

async function createUser(db: any, uid: string, name: string) {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await setDoc(userRef, {
        userId: uid,
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

async function runSystemTest() {
    console.log("Starting Full System Test...");

    // Init Users
    const app1 = initializeApp(firebaseConfig, "User1");
    const app2 = initializeApp(firebaseConfig, "User2");

    const nav1 = { auth: getAuth(app1), db: getFirestore(app1) };
    const nav2 = { auth: getAuth(app2), db: getFirestore(app2) };

    try {
        // 1. Auth & Profile
        const cred1 = await signInAnonymously(nav1.auth);
        const cred2 = await signInAnonymously(nav2.auth);
        const uid1 = cred1.user.uid;
        const uid2 = cred2.user.uid;

        await createUser(nav1.db, uid1, "Alice");
        await createUser(nav2.db, uid2, "Bob");

        // 2. Create Chat (Manual Match simulation)
        console.log("2. creating chat...");
        const chatRef = await addDoc(collection(nav1.db, COLLECTIONS.CHATS), {
            participants: [uid1, uid2],
            createdAt: serverTimestamp(),
            active: true,
            status: "active",
            lastMessageAt: serverTimestamp(),
            messageCount: 0
        });
        const chatId = chatRef.id;
        console.log(`   Chat created: ${chatId}`);

        // 3. Send Messages
        console.log("3. Sending messages...");
        const msgsRef = collection(nav1.db, COLLECTIONS.CHATS, chatId, "messages");
        await addDoc(msgsRef, {
            senderId: uid1,
            receiverId: uid2,
            content: "Hello Bob!",
            createdAt: serverTimestamp(),
            moderationStatus: "approved"
        });

        // Bob replies
        const msgsRef2 = collection(nav2.db, COLLECTIONS.CHATS, chatId, "messages");
        await addDoc(msgsRef2, {
            senderId: uid2,
            receiverId: uid1,
            content: "Hi Alice!",
            createdAt: serverTimestamp(),
            moderationStatus: "approved"
        });
        console.log("   Messages exchanged.");

        // 4. Bob reports Alice
        console.log("4. Bob reporting Alice...");
        const reportsRef = collection(nav2.db, COLLECTIONS.REPORTS);
        await addDoc(reportsRef, {
            reporterId: uid2,
            reportedUserId: uid1,
            chatId: chatId,
            reason: "other",
            description: "Test report",
            status: "pending",
            createdAt: serverTimestamp()
        });
        console.log("   Report filed.");

        // 5. Alice blocks Bob
        console.log("5. Alice blocking Bob...");
        // Alice updates her profile to add Bob to blockedUsers
        const aliceRef = doc(nav1.db, COLLECTIONS.USERS, uid1);
        // Note: In real app, we use arrayUnion, but here for test simplicity we just read-modify-write or use update
        // We need to import arrayUnion if we want to be precise, or just use update with the array if allowed.
        // Actually, let's just inspect the block functionality logic:
        // Core logic is: updateDoc(userRef, { blockedUsers: arrayUnion(targetId) })
        await updateDoc(aliceRef, {
            blockedUsers: arrayUnion(uid2)
        });
        console.log("   Bob blocked.");

        // 6. Verify Block
        const aliceSnap = await getDoc(aliceRef);
        if (aliceSnap.exists() && aliceSnap.data()?.blockedUsers?.includes(uid2)) {
            console.log("✅ SUCCESS: Block list updated.");
        } else {
            console.error("❌ FAILURE: Block list mismatch.", aliceSnap.exists() ? aliceSnap.data() : "Doc missing");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        await deleteApp(app1);
        await deleteApp(app2);
        process.exit(0);
    }
}

runSystemTest();
