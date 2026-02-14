// src/lib/moderation.ts
// Client-side moderation utility — calls the server-side /api/moderate route
// and handles violation tracking.

import { doc, updateDoc, increment } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/types";

export interface ModerationResult {
    safe: boolean;
    toxicityScore: number;
    category: "safe" | "sexual_content" | "harassment" | "abusive_language";
    reason: string;
}

/**
 * Moderate a message through the Gemini API.
 * Returns the moderation result with safety verdict and toxicity score.
 */
export async function moderateMessage(
    message: string
): Promise<ModerationResult> {
    // API calls disabled for Static Version (Free Tier)
    try {
        const response = await fetch("/api/moderate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });

        if (!response.ok) {
            console.error("[Moderation] API returned status:", response.status);
            // Fail open
            return {
                safe: true,
                toxicityScore: 0,
                category: "safe",
                reason: "Moderation API unavailable.",
            };
        }

        return (await response.json()) as ModerationResult;
    } catch (error) {
        console.error("[Moderation] Request failed:", error);
        // Fail open
        return {
            safe: true,
            toxicityScore: 0,
            category: "safe",
            reason: "Moderation request failed.",
        };
    }
}

/**
 * Increment the violation count for a user in Firestore.
 */
export async function incrementViolationCount(userId: string): Promise<void> {
    const db = getFirebaseDb();
    if (!db) return;

    try {
        await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
            violationCount: increment(1),
        });
    } catch (error) {
        console.error("[Moderation] Failed to increment violation count:", error);
    }
}

/**
 * Get a user-friendly warning message based on the moderation category.
 */
export function getWarningMessage(category: ModerationResult["category"]): string {
    switch (category) {
        case "sexual_content":
            return "⚠️ Your message was blocked because it contains sexual or explicit content. This is not allowed.";
        case "harassment":
            return "⚠️ Your message was blocked because it contains harassment or threatening language.";
        case "abusive_language":
            return "⚠️ Your message was blocked because it contains abusive language or hate speech.";
        default:
            return "⚠️ Your message was blocked due to a content policy violation.";
    }
}
