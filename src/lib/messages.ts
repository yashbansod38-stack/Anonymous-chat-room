// src/lib/messages.ts
// Message sending and realtime subscription for chat messages.

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    increment,
    serverTimestamp,
    type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, type MessageDoc } from "@/types";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore not initialized");
    return db;
}

// ─── Send Message ─────────────────────────────────────────────────

export async function sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    content: string
): Promise<string> {
    const db = requireDb();

    // Add message to subcollection
    const msgRef = await addDoc(
        collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES),
        {
            senderId,
            receiverId,
            content,
            createdAt: serverTimestamp(),
            moderationStatus: "pending",
            toxicityScore: 0,
            isDeleted: false,
            editedAt: null,
        }
    );

    // Update the parent chat document
    await updateDoc(doc(db, COLLECTIONS.CHATS, chatId), {
        lastMessagePreview: content.slice(0, 100),
        lastMessageSenderId: senderId,
        lastMessageAt: serverTimestamp(),
        messageCount: increment(1),
    });

    return msgRef.id;
}

// ─── Subscribe to Messages ────────────────────────────────────────

export function subscribeToMessages(
    chatId: string,
    callback: (messages: MessageDoc[]) => void,
    messageLimit: number = 100
): Unsubscribe {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES),
        orderBy("createdAt", "asc"),
        limit(messageLimit)
    );

    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as MessageDoc
        );
        callback(messages);
    });
}
