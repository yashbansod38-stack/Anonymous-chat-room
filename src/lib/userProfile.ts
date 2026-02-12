// src/lib/userProfile.ts
// User profile management — create, read, update, and username uniqueness.

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    getDocs,
    collection,
    query,
    where,
    serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, type UserDoc } from "@/types";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore not initialized");
    return db;
}

// ─── Create or Get Profile ──────────────────────────────────────────

/**
 * Get an existing user profile, or return null if it doesn't exist.
 */
export async function getUserProfile(userId: string): Promise<UserDoc | null> {
    const db = requireDb();
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!snap.exists()) return null;
    return { userId: snap.id, ...snap.data() } as UserDoc;
}

/**
 * Create a new user profile in Firestore.
 * Called once during onboarding after username is chosen.
 */
export async function createUserProfile(
    userId: string,
    displayName: string,
    isAnonymous: boolean = true
): Promise<void> {
    const db = requireDb();
    await setDoc(doc(db, COLLECTIONS.USERS, userId), {
        userId,
        displayName,
        displayNameLower: displayName.toLowerCase(),
        isAnonymous,
        isBlocked: false,
        violationCount: 0,
        blockedUsers: [],
        createdAt: serverTimestamp(),
        lastActiveAt: serverTimestamp(),
    });
}

/**
 * Update the user's last active timestamp.
 */
export async function updateLastActive(userId: string): Promise<void> {
    const db = requireDb();
    try {
        await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
            lastActiveAt: serverTimestamp(),
        });
    } catch {
        // Ignore if doc doesn't exist yet
    }
}

// ─── Username Uniqueness ────────────────────────────────────────────

/**
 * Check if a username is already taken by another user.
 * Case-insensitive comparison via lowercase stored field.
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.USERS),
        where("displayNameLower", "==", username.toLowerCase().trim())
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

/**
 * Validate username format:
 * - 3-16 characters
 * - Only letters, numbers, underscores
 * - No spaces
 */
export function validateUsername(username: string): string | null {
    const trimmed = username.trim();
    if (trimmed.length < 3) return "Username must be at least 3 characters";
    if (trimmed.length > 16) return "Username must be 16 characters or less";
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed))
        return "Only letters, numbers, and underscores allowed";
    return null; // valid
}

/**
 * Get a user's display name by their ID.
 */
export async function getDisplayName(userId: string): Promise<string> {
    try {
        const profile = await getUserProfile(userId);
        return profile?.displayName || `User_${userId.slice(0, 6)}`;
    } catch {
        return `User_${userId.slice(0, 6)}`;
    }
}
