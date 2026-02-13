
import { initializeApp, deleteApp } from "firebase/app";
import {
    getFirestore,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
    measurementId: "G-9E9YESX5QE"
};

async function verifyIndex() {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    try {
        await signInAnonymously(auth);
        console.log("Auth successful.");

        console.log("Attempting matchmaking query...");
        // Replicating the exact query from matchmaking.ts
        const q = query(
            collection(db, "matchQueue"),
            where("status", "==", "waiting"),
            orderBy("createdAt", "asc"),
            limit(10)
        );

        await getDocs(q);
        console.log("✅ Query successful! Index exists.");

    } catch (error: any) {
        console.error("❌ Query Failed!");
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
            console.log("Reason: MISSING INDEX");
            console.log(error.message);
        } else {
            console.error(error);
        }
    } finally {
        await deleteApp(app);
        process.exit(0);
    }
}

verifyIndex();
