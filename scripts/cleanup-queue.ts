
import { initializeApp, deleteApp } from "firebase/app";
import {
    getFirestore,
    collection,
    getDocs,
    deleteDoc,
    query,
    where,
    doc
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
    MATCH_QUEUE: "matchQueue"
};

async function cleanupQueue() {
    console.log("Starting Queue Cleanup...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    try {
        const q = query(
            collection(db, COLLECTIONS.MATCH_QUEUE),
            where("status", "==", "waiting")
        );
        const snapshot = await getDocs(q);

        console.log(`Found ${snapshot.size} waiting requests.`);

        let deletedCount = 0;
        const deletePromises = snapshot.docs.map(async (d) => {
            await deleteDoc(doc(db, COLLECTIONS.MATCH_QUEUE, d.id));
            deletedCount++;
        });

        await Promise.all(deletePromises);
        console.log(`✅ Deleted ${deletedCount} stale requests.`);

    } catch (error) {
        console.error("Cleanup Failed:", error);
    } finally {
        await deleteApp(app);
        process.exit(0);
    }
}

cleanupQueue();
