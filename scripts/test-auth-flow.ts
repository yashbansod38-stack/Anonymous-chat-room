
import { initializeApp, deleteApp } from "firebase/app";
import {
    getAuth,
    signInAnonymously,
    signInWithEmailAndPassword,
    linkWithCredential,
    EmailAuthProvider,
    signOut
} from "firebase/auth";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp
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

const COLLECTIONS = { USERS: "users" };

async function runAuthTest() {
    console.log("Starting Auth Flow Test...");
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    const TEST_USER = `AuthTest_${Math.random().toString(36).substring(7)}`;
    const TEST_PASS = "password123";
    const TEST_EMAIL = `${TEST_USER.toLowerCase()}@safe-anon-chat.com`;

    try {
        // 1. Sign In Anonymously
        console.log("1. Signing in anonymously...");
        const anonCred = await signInAnonymously(auth);
        const originalUid = anonCred.user.uid;
        console.log(`   Anonymous UID: ${originalUid}`);

        // 2. Upgrade Account (Link Credential)
        console.log(`2. Upgrading account to ${TEST_USER} / ${TEST_PASS}...`);
        const credential = EmailAuthProvider.credential(TEST_EMAIL, TEST_PASS);
        await linkWithCredential(auth.currentUser!, credential);
        console.log("   Link successful.");

        // 3. Create Profile (mimic AuthContext logic)
        console.log("3. Creating/Updating profile...");

        const userRef = doc(db, COLLECTIONS.USERS, originalUid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            // Mimic the fixed createUserProfile logic
            console.log("   Profile exists, updating...");
            // Note: in a real app we'd use updateDoc, but here we can just verify the logic
            // or actually call updateDoc to pass the rules.
            const { updateDoc } = await import("firebase/firestore");
            await updateDoc(userRef, {
                displayName: TEST_USER,
                displayNameLower: TEST_USER.toLowerCase(),
                isAnonymous: false,
                lastActiveAt: serverTimestamp(),
            });
        } else {
            console.log("   Profile missing (unexpected for anon), creating...");
            await setDoc(userRef, {
                userId: originalUid,
                displayName: TEST_USER,
                displayNameLower: TEST_USER.toLowerCase(),
                isAnonymous: false,
                createdAt: serverTimestamp(),
                lastActiveAt: serverTimestamp(),
                isBlocked: false,
                violationCount: 0,
                blockedUsers: []
            });
        }

        console.log("   Profile updated.");

        // 4. Logout
        console.log("4. Logging out...");
        await signOut(auth);

        // 5. Login with Password
        console.log("5. Logging in with password...");
        const loginCred = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASS);
        const newUid = loginCred.user.uid;
        console.log(`   Logged in UID: ${newUid}`);

        if (originalUid === newUid) {
            console.log("✅ SUCCESS: UIDs match! Account persistence verified.");
        } else {
            console.error("❌ FAILURE: UIDs do not match.");
        }

        // 6. Verify Profile
        const endSnap = await getDoc(doc(db, COLLECTIONS.USERS, newUid));
        if (endSnap.exists() && endSnap.data().displayName === TEST_USER && endSnap.data().isAnonymous === false) {
            console.log("✅ SUCCESS: Profile verified (isAnonymous: false).");
        } else {
            console.error("❌ FAILURE: Profile verification failed.", endSnap.exists() ? endSnap.data() : "Doc missing");
        }

    } catch (error) {
        console.error("Test Failed:", error);
    } finally {
        await deleteApp(app);
        process.exit(0);
    }
}

runAuthTest();
