import { useState, useEffect, useCallback } from "react";
import { doc, updateDoc, serverTimestamp, onSnapshot, Timestamp } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/types";

export function useReadReceipts(chatId: string | null, userId: string | null) {
    const [partnerLastRead, setPartnerLastRead] = useState<Timestamp | null>(null);

    // Listen for partner's read status
    useEffect(() => {
        if (!chatId || !userId) {
            setPartnerLastRead(null);
            return;
        }

        const db = getFirebaseDb();
        if (!db) return;

        const unsub = onSnapshot(doc(db, COLLECTIONS.CHATS, chatId), (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.data();
            const lastReadMap = data.lastRead || {};

            // Find peer ID
            const peerId = Object.keys(lastReadMap).find((id) => id !== userId);
            if (peerId) {
                setPartnerLastRead(lastReadMap[peerId]);
            }
        });

        return () => unsub();
    }, [chatId, userId]);

    // Mark chat as read
    const markAsRead = useCallback(async () => {
        if (!chatId || !userId) return;

        const db = getFirebaseDb();
        if (!db) return;

        try {
            const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
            await updateDoc(chatRef, {
                [`lastRead.${userId}`]: serverTimestamp(),
            });
        } catch (error) {
            console.warn("Failed to mark chat as read:", error);
        }
    }, [chatId, userId]);

    return { partnerLastRead, markAsRead };
}
