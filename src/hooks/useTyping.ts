import { useState, useEffect, useRef, useCallback } from "react";
import { doc, updateDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/types";

const TYPING_TIMEOUT_MS = 3000; // time before indicator disappears
const UPDATE_THROTTLE_MS = 2000; // time between writes to Firestore

export function useTyping(chatId: string | null, userId: string | null) {
    const [isPeerTyping, setIsPeerTyping] = useState(false);
    const lastUpdateRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Listen for peer's typing status
    useEffect(() => {
        if (!chatId || !userId) {
            setIsPeerTyping(false);
            return;
        }

        const db = getFirebaseDb();
        if (!db) return;

        const unsub = onSnapshot(doc(db, COLLECTIONS.CHATS, chatId), (snapshot) => {
            if (!snapshot.exists()) return;

            const data = snapshot.data();
            const typingMap = data.typing || {};

            // Find peer ID (any key that isn't our userId)
            const peerId = Object.keys(typingMap).find((id) => id !== userId);
            if (!peerId) {
                setIsPeerTyping(false);
                return;
            }

            const lastTypingTimestamp = typingMap[peerId];
            if (!lastTypingTimestamp) {
                setIsPeerTyping(false);
                return;
            }

            const lastTypingTime = lastTypingTimestamp.toMillis
                ? lastTypingTimestamp.toMillis()
                : (lastTypingTimestamp.seconds * 1000) || 0;

            const now = Date.now();
            const isActive = now - lastTypingTime < TYPING_TIMEOUT_MS;

            setIsPeerTyping(isActive);

            // Set a local timeout to clear the status if no new update comes
            if (isActive) {
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                const timeRemaining = TYPING_TIMEOUT_MS - (now - lastTypingTime);
                timeoutRef.current = setTimeout(() => setIsPeerTyping(false), timeRemaining);
            }
        });

        return () => {
            unsub();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [chatId, userId]);

    // Function to call when user types
    const handleTyping = useCallback(async () => {
        if (!chatId || !userId) return;

        const now = Date.now();
        if (now - lastUpdateRef.current < UPDATE_THROTTLE_MS) return;

        lastUpdateRef.current = now;

        const db = getFirebaseDb();
        if (!db) return;

        try {
            const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
            await updateDoc(chatRef, {
                [`typing.${userId}`]: serverTimestamp(),
            });
        } catch (error) {
            // Ignore errors (typing indicators are non-critical)
            console.warn("Failed to update typing status", error);
        }
    }, [chatId, userId]);

    return { isPeerTyping, handleTyping };
}
