
import { initializeApp, deleteApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC7GsQGoMB4T4DgWYvTnBkQm8PCp444sD4",
    authDomain: "anonymous-chat-7cfd4.firebaseapp.com",
    projectId: "anonymous-chat-7cfd4",
    storageBucket: "anonymous-chat-7cfd4.firebasestorage.app",
    messagingSenderId: "994691904075",
    appId: "1:994691904075:web:2be73e16c701465d9ad3ce",
};

const COLLECTIONS = [
    "users",
    "chats",
    "matchQueue",
    "reports",
    "connectionRequests"
];

async function cleanupFirestore() {
    console.log("🔥 Starting Request Cleanup...");
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    for (const colName of COLLECTIONS) {
        console.log(`Cleaning collection: ${colName}...`);
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);

        if (snapshot.size === 0) {
            console.log(`  - Empty.`);
            continue;
        }

        const batchSize = 400;
        let batch = writeBatch(db);
        let count = 0;
        let total = 0;

        for (const d of snapshot.docs) {
            // If deleting a chat, we should also delete its subcollection 'messages'
            // The client SDK cannot delete collections / subcollections easily.
            // We would need to query them.
            if (colName === "chats") {
                const messagesRef = collection(db, "chats", d.id, "messages");
                const msgsSnap = await getDocs(messagesRef);
                for (const m of msgsSnap.docs) {
                    batch.delete(doc(db, "chats", d.id, "messages", m.id));
                    count++;
                    if (count >= batchSize) {
                        await batch.commit();
                        batch = writeBatch(db);
                        count = 0;
                    }
                }
            }

            batch.delete(doc(db, colName, d.id));
            count++;
            if (count >= batchSize) {
                await batch.commit();
                console.log(`  - Deleted batch...`);
                batch = writeBatch(db);
                count = 0;
            }
            total++;
        }

        if (count > 0) {
            await batch.commit();
        }
        console.log(`  - Deleted ${total} docs.`);
    }

    console.log("✅ Cleanup Complete.");
    await deleteApp(app);
}

cleanupFirestore();
