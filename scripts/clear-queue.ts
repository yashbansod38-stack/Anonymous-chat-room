
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
};

async function clearQueue() {
    console.log("🔥 Clearing Match Queue...");
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    await signInAnonymously(auth);
    console.log("Signed in anonymously.");

    const db = getFirestore(app);
    const queueRef = collection(db, "matchQueue");

    const snapshot = await getDocs(queueRef);
    console.log(`Found ${snapshot.size} documents in queue.`);

    if (snapshot.size === 0) {
        console.log("Queue is empty.");
        await deleteApp(app);
        return;
    }

    const batchSize = 400;
    let batch = writeBatch(db);
    let count = 0;
    let totalDeleted = 0;

    for (const d of snapshot.docs) {
        batch.delete(doc(db, "matchQueue", d.id));
        count++;
        if (count >= batchSize) {
            await batch.commit();
            console.log(`Deleted ${count} docs...`);
            totalDeleted += count;
            batch = writeBatch(db);
            count = 0;
        }
    }

    if (count > 0) {
        await batch.commit();
        totalDeleted += count;
    }

    console.log(`✅ Cleared ${totalDeleted} documents.`);
    await deleteApp(app);
}

clearQueue();
