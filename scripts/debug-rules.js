
const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require("firebase/auth");
const { getFirestore, doc, setDoc, updateDoc, collection, addDoc, serverTimestamp } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function run() {
    console.log("🔥 Starting Rule Verification...");

    // 1. Auth
    const email = `debugger_${Date.now()}@test.com`;
    const password = "password123";
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("✅ Auth Success:", auth.currentUser.uid);
    } catch (e) {
        console.error("❌ Auth Failed:", e.message);
        return;
    }

    const uid = auth.currentUser.uid;
    const otherUid = "some_random_other_uid";

    // 2. Test Chat Creation
    console.log("\n--- Testing Chat Creation ---");
    try {
        await addDoc(collection(db, "chats"), {
            participants: [uid, otherUid],
            status: 'active',
            createdAt: serverTimestamp()
        });
        console.log("✅ Chat Creation Allowed");
    } catch (e) {
        console.error("❌ Chat Creation DENIED:", e.message);
    }

    // 3. Test Match Queue Update (Self)
    console.log("\n--- Testing Match Queue Update (Self) ---");
    let myQueueId;
    try {
        const docRef = await addDoc(collection(db, "matchQueue"), {
            userId: uid,
            status: "waiting"
        });
        myQueueId = docRef.id;
        console.log("✅ Queue Create Allowed");

        await updateDoc(doc(db, "matchQueue", myQueueId), {
            status: "matched"
        });
        console.log("✅ Queue Update (Self) Allowed");
    } catch (e) {
        console.error("❌ Queue Update (Self) DENIED:", e.message);
    }

    // 4. Test Match Queue Update (Other) - Simulating Matchmaking
    console.log("\n--- Testing Match Queue Update (Other) ---");
    try {
        // First we need a doc to exist (simulating another user)
        // We can't create it as "otherUid" easily unless we are admin or rules are loose.
        // But the rule is `allow update: if isAuth()`.
        // So if I can't create it, I can't test update?
        // Wait, the previous test passed `addDoc` for self.

        // Let's try to update a "fake" doc? No, it must exist.
        // I will try to update *my own* doc but pretending to be matching?
        // Actually, the rules don't check WHO owns the doc for the 2nd rule.

        if (myQueueId) {
            await updateDoc(doc(db, "matchQueue", myQueueId), {
                matchedWith: otherUid
            });
            console.log("✅ Queue Update (Arbitrary Field) Allowed");
        }
    } catch (e) {
        console.error("❌ Queue Update (Arbitrary) DENIED:", e.message);
    }

    process.exit(0);
}

run();
