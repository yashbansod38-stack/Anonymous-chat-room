// src/lib/ban.ts
// Automatic ban system — check and enforce violation threshold.

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/types";

const BAN_THRESHOLD = 5;

export interface BanStatus {
    isBlocked: boolean;
    violationCount: number;
}

/**
 * Check if a user is currently blocked.
 * Returns their block status and current violation count.
 */
export async function checkBanStatus(userId: string): Promise<BanStatus> {
    const db = getFirebaseDb();
    if (!db) return { isBlocked: false, violationCount: 0 };

    try {
        const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (!userSnap.exists()) return { isBlocked: false, violationCount: 0 };

        const data = userSnap.data();
        return {
            isBlocked: data.isBlocked === true,
            violationCount: data.violationCount ?? 0,
        };
    } catch (error) {
        console.error("[Ban] Failed to check ban status:", error);
        return { isBlocked: false, violationCount: 0 };
    }
}

/**
 * Enforce the ban threshold after a violation is recorded.
 * If violationCount >= BAN_THRESHOLD, mark the user as blocked.
 * Returns true if the user was just blocked.
 */
export async function enforceBanThreshold(userId: string): Promise<boolean> {
    const db = getFirebaseDb();
    if (!db) return false;

    try {
        const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (!userSnap.exists()) return false;

        const data = userSnap.data();
        const currentCount = (data.violationCount ?? 0) as number;

        if (currentCount >= BAN_THRESHOLD && !data.isBlocked) {
            await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
                isBlocked: true,
            });
            return true;
        }

        return data.isBlocked === true;
    } catch (error) {
        console.error("[Ban] Failed to enforce ban threshold:", error);
        return false;
    }
}

/**
 * Get a remaining-warnings message for the user.
 */
export function getRemainingWarnings(violationCount: number): string {
    const remaining = BAN_THRESHOLD - violationCount;
    if (remaining <= 0) return "Your account has been suspended.";
    if (remaining === 1) return "⚠️ Final warning! One more violation will result in a ban.";
    return `You have ${remaining} warning${remaining !== 1 ? "s" : ""} remaining before a ban.`;
}
