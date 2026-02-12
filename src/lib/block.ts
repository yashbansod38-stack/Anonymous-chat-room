// src/lib/block.ts
// Block service — block users to prevent future matching.

import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/types";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore not initialized");
    return db;
}

/**
 * Block another user. Adds them to the current user's blockedUsers array.
 * This prevents future matching in both directions.
 */
export async function blockUser(
    currentUserId: string,
    targetUserId: string
): Promise<void> {
    const db = requireDb();

    // Add targetUser to current user's blockedUsers list
    await updateDoc(doc(db, COLLECTIONS.USERS, currentUserId), {
        blockedUsers: arrayUnion(targetUserId),
    });

    // Also add current user to target's blockedUsers (bidirectional block)
    try {
        await updateDoc(doc(db, COLLECTIONS.USERS, targetUserId), {
            blockedUsers: arrayUnion(currentUserId),
        });
    } catch {
        // Target user doc may not exist — that's ok
    }
}

/**
 * Check if a user has blocked another user.
 */
export async function isUserBlocked(
    currentUserId: string,
    targetUserId: string
): Promise<boolean> {
    const db = requireDb();

    try {
        const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, currentUserId));
        if (!userSnap.exists()) return false;

        const data = userSnap.data();
        const blockedList = (data.blockedUsers ?? []) as string[];
        return blockedList.includes(targetUserId);
    } catch {
        return false;
    }
}

/**
 * Get the full blocked users list for a user.
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
    const db = requireDb();

    try {
        const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (!userSnap.exists()) return [];
        return (userSnap.data().blockedUsers ?? []) as string[];
    } catch {
        return [];
    }
}
