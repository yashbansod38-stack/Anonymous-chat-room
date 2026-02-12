// src/lib/matchmaking.ts
// Matchmaking service — handles queue management, matching, and chat creation.

import {
    collection,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    onSnapshot,
    runTransaction,
    type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, type MatchQueueDoc } from "@/types";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore not initialized");
    return db;
}

// ─── Join Queue ────────────────────────────────────────────────────

/**
 * Add current user to the match queue.
 * If a suitable match is found, both users are paired and a chat is created.
 */
export async function joinMatchQueue(
    userId: string,
    recentMatches: string[] = [],
    blockedUsers: string[] = []
): Promise<string> {
    const db = requireDb();
    const queueRef = doc(collection(db, COLLECTIONS.MATCH_QUEUE));
    const docId = queueRef.id;

    // First, look for someone already waiting
    const match = await findMatch(userId, recentMatches, blockedUsers);

    if (match) {
        // Use a transaction to atomically claim the match
        // (prevents two users from grabbing the same waiting user)
        try {
            const chatId = await runTransaction(db, async (transaction) => {
                const matchRef = doc(db, COLLECTIONS.MATCH_QUEUE, match.id);
                const matchSnap = await transaction.get(matchRef);

                // Re-check: is this user still waiting?
                if (!matchSnap.exists() || matchSnap.data()?.status !== "waiting") {
                    throw new Error("MATCH_TAKEN");
                }

                // Create the chat
                const newChatId = await createMatchedChat(userId, match.userId);

                // Update the matched user's queue entry
                transaction.update(matchRef, {
                    status: "matched",
                    matchedWith: userId,
                    chatId: newChatId,
                });

                // Create our own entry as already matched
                transaction.set(queueRef, {
                    userId,
                    status: "matched",
                    createdAt: serverTimestamp(),
                    matchedWith: match.userId,
                    chatId: newChatId,
                    recentMatches,
                });

                return newChatId;
            });

            // chatId is used implicitly (stored in queue docs above)
            void chatId;
            return docId;
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : "";
            if (errMsg === "MATCH_TAKEN") {
                // Someone else grabbed this match — fall through to queue
                console.log("[Matchmaking] Match was taken, joining queue instead.");
            } else {
                throw error;
            }
        }
    }

    // No match found (or match was taken) — add to queue and wait
    await setDoc(queueRef, {
        userId,
        status: "waiting",
        createdAt: serverTimestamp(),
        matchedWith: null,
        chatId: null,
        recentMatches,
    });

    return docId;
}

// ─── Find Match ────────────────────────────────────────────────────

/**
 * Look for a waiting user in the queue who is:
 * - Not the current user
 * - Not blocked (system-wide)
 * - Not in the recent matches list
 * - Not in either user's blockedUsers list
 */
async function findMatch(
    userId: string,
    recentMatches: string[],
    blockedUsers: string[] = []
): Promise<MatchQueueDoc | null> {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.MATCH_QUEUE),
        where("status", "==", "waiting"),
        orderBy("createdAt", "asc"),
        limit(10)
    );

    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data() as Omit<MatchQueueDoc, "id">;

        // Skip self
        if (data.userId === userId) continue;

        // Skip recently matched users
        if (recentMatches.includes(data.userId)) continue;

        // Skip if the other user also recently matched with us
        if (data.recentMatches?.includes(userId)) continue;

        // Skip users we have blocked
        if (blockedUsers.includes(data.userId)) continue;

        // Check if user is blocked (system-wide ban)
        const isBanned = await checkUserBlocked(data.userId);
        if (isBanned) continue;

        // Check if the other user has blocked us
        const { getBlockedUsers } = await import("@/lib/block");
        const theirBlockedList = await getBlockedUsers(data.userId);
        if (theirBlockedList.includes(userId)) continue;

        return { id: docSnap.id, ...data } as MatchQueueDoc;
    }

    return null;
}

// ─── Create Matched Chat ──────────────────────────────────────────

async function createMatchedChat(
    userId1: string,
    userId2: string
): Promise<string> {
    const db = requireDb();
    const chatRef = doc(collection(db, COLLECTIONS.CHATS));
    const chatId = chatRef.id;

    await setDoc(chatRef, {
        participants: [userId1, userId2],
        status: "active" as const,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessagePreview: "",
        lastMessageSenderId: "",
        messageCount: 0,
    });

    return chatId;
}

// ─── Check Blocked ────────────────────────────────────────────────

async function checkUserBlocked(userId: string): Promise<boolean> {
    const db = requireDb();
    try {
        const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
        if (userDoc.exists()) {
            return userDoc.data()?.isBlocked === true;
        }
    } catch {
        // If user doc doesn't exist, they're not blocked
    }
    return false;
}

// ─── Leave Queue ──────────────────────────────────────────────────

export async function leaveMatchQueue(queueDocId: string): Promise<void> {
    const db = requireDb();
    await deleteDoc(doc(db, COLLECTIONS.MATCH_QUEUE, queueDocId));
}

// ─── Listen for Match ─────────────────────────────────────────────

/**
 * Subscribe to a queue document to detect when a match is found.
 * Calls onMatched with the chatId when matched.
 */
export function listenForMatch(
    queueDocId: string,
    onMatched: (chatId: string, matchedWith: string) => void,
    onError?: (error: Error) => void
): Unsubscribe {
    const db = requireDb();
    return onSnapshot(
        doc(db, COLLECTIONS.MATCH_QUEUE, queueDocId),
        (snap) => {
            if (!snap.exists()) return;
            const data = snap.data() as MatchQueueDoc;
            if (data.status === "matched" && data.chatId && data.matchedWith) {
                onMatched(data.chatId, data.matchedWith);
            }
        },
        (error) => onError?.(error as Error)
    );
}

// ─── End Chat ─────────────────────────────────────────────────────

export async function endChat(chatId: string): Promise<void> {
    const db = requireDb();
    await updateDoc(doc(db, COLLECTIONS.CHATS, chatId), {
        status: "ended",
    });
}
