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

    // 0. Client-Side Moderation (Pre-Encryption)
    // We must check content before encrypting, otherwise server sees gibberish.
    try {
        const modRes = await fetch("/api/moderate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: content }),
        });

        if (modRes.ok) {
            const modData = await modRes.json();
            if (!modData.safe) {
                // Reject the message immediately
                throw new Error(`Message blocked: ${modData.category} (${modData.reason})`);
            }
        }
    } catch (e: any) {
        // If it's the block error, rethrow it
        if (e.message?.startsWith("Message blocked")) throw e;
        // Otherwise, fail open or log warning (we don't want to block users if API is down)
        console.warn("[Message] Moderation check failed, allowing message:", e);
    }

    // E2EE Logic
    let finalContent = content;
    let type = "text";
    let iv: string | undefined;

    try {
        const { getSharedKey, encryptMessage } = await import("@/lib/e2ee");
        const sharedKey = await getSharedKey(receiverId);

        if (sharedKey) {
            const encrypted = await encryptMessage(content, sharedKey);
            finalContent = encrypted.ciphertext;
            iv = encrypted.iv;
            type = "encrypted";
        }
    } catch (e) {
        console.warn("[Message] Encryption failed, falling back to plaintext:", e);
    }

    // 2. Add message to batch
    batch.set(newMessageRef, {
        senderId,
        receiverId,
        content: finalContent,
        type,
        iv: iv || null,
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

    // 5. Trigger Notification (Fire-and-forget)
    try {
        const auth = getFirebaseDb()?.app ? (await import("firebase/auth")).getAuth() : null;
        if (auth?.currentUser) {
            auth.currentUser.getIdToken().then(token => {
                fetch("/api/notify", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        targetUserId: receiverId,
                        title: "New Message",
                        body: content.slice(0, 100) || "You received a message",
                        // icon: userAvatarUrl // Future improvement
                    })
                }).catch(err => console.error("Notification trigger failed:", err));
            });
        }
    } catch (e) {
        console.error("Failed to trigger notification flow", e);
    }

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
