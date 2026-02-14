import { useEffect } from "react";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS } from "@/types";

export function usePresence(userId: string | null) {
    useEffect(() => {
        if (!userId) return;

        const db = getFirebaseDb();
        if (!db) return;

        const updatePresence = async () => {
            try {
                const userRef = doc(db, COLLECTIONS.USERS, userId);
                await updateDoc(userRef, {
                    lastActiveAt: serverTimestamp(),
                });
            } catch (error) {
                console.error("Failed to update presence:", error);
            }
        };

        // Update immediately on mount
        updatePresence();

        // Update every 60 seconds
        const interval = setInterval(updatePresence, 60 * 1000);

        return () => clearInterval(interval);
    }, [userId]);
}
