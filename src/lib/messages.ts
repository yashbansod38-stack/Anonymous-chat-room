// src/lib/messages.ts
// Message sending and realtime subscription for chat messages.

import {
    collection,
    doc,
    onSnapshot,
    query,
    orderBy,
    limit,
    increment,
    serverTimestamp,
    writeBatch,
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
    const batch = writeBatch(db);

    // 1. Create message ref
    const messagesRef = collection(db, COLLECTIONS.CHATS, chatId, COLLECTIONS.MESSAGES);
    const newMessageRef = doc(messagesRef);

    // 2. Add message to batch
    batch.set(newMessageRef, {
        senderId,
        receiverId,
        content,
        createdAt: serverTimestamp(),
        moderationStatus: "pending",
        toxicityScore: 0,
        isDeleted: false,
        editedAt: null,
    });

    // 3. Update chat metadata to batch
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    batch.update(chatRef, {
        lastMessagePreview: content.slice(0, 100),
        lastMessageSenderId: senderId,
        lastMessageAt: serverTimestamp(),
        messageCount: increment(1),
    });

    // 4. Commit batch
    await batch.commit();

    return newMessageRef.id;
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
