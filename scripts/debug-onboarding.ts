
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInAnonymously, linkWithCredential, EmailAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
};

async function testOnboarding() {
    console.log("🚀 Starting Onboarding Debug Test...");
    const app = initializeApp(firebaseConfig, "DebugUser_" + Date.now());
    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
        // 1. Sign In Anonymously
        console.log("1. Signing in anonymously...");
        const cred = await signInAnonymously(auth);
        const user = cred.user;
        console.log(`   User: ${user.uid}, Anon: ${user.isAnonymous}`);

        // 2. Link Credential
        const username = "debug_user_" + Math.floor(Math.random() * 10000);
        const email = `${username}@safe-anon-chat.com`;
        const password = "password123";
        console.log(`2. Linking credential: ${email}`);

        const credential = EmailAuthProvider.credential(email, password);
        await linkWithCredential(user, credential);
        console.log("   Link successful!");

        // 3. Create Profile (Replicating createUserProfile logic)
        console.log("3. Creating/Updating Profile in Firestore...");
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
            console.log("   Updating existing doc...");
            await updateDoc(userRef, {
                displayName: username,
                displayNameLower: username.toLowerCase(),
                isAnonymous: false,
                lastActiveAt: serverTimestamp(),
            });
        } else {
            console.log("   Creating new doc...");
            await setDoc(userRef, {
                userId: user.uid,
                displayName: username,
                displayNameLower: username.toLowerCase(),
                isAnonymous: false, // simulating post-link update
                isBlocked: false,
                violationCount: 0,
                blockedUsers: [],
                createdAt: serverTimestamp(),
                lastActiveAt: serverTimestamp(),
            });
        }
        console.log("   Profile write successful!");

        console.log("✅ Onboarding Test PASSED!");

    } catch (e: any) {
        console.error("❌ Onboarding Test FAILED:");
        console.error("Code:", e.code);
        console.error("Message:", e.message);
    } finally {
        await deleteApp(app);
    }
}

testOnboarding();
