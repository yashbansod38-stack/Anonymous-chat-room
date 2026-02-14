// src/lib/admin.ts
// Admin service — fetch platform stats, reports, banned users, and manual ban.

import {
    collection,
    doc,
    getDocs,
    getDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    getCountFromServer,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, type ReportDoc, type UserDoc } from "@/types";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore not initialized");
    return db;
}

// ─── Stats ─────────────────────────────────────────────────────────

export interface PlatformStats {
    totalUsers: number;
    totalChats: number;
    totalReports: number;
    pendingReports: number;
    bannedUsers: number;
    activeConnections: number;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
    const db = requireDb();

    // Helper to fetch count safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCountSafe = async (name: string, q: any) => {
        try {
            const snap = await getCountFromServer(q);
            return snap.data().count;
        } catch (e: unknown) {
            const err = e as Error;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            console.error(`[Admin] Failed to count ${name}:`, (err as any).code, err.message);
            throw e; // Re-throw to be caught by Promise.allSettled in the UI, or handle here?
            // Actually, if we return -1 or throw, the UI will fail.
            // Let's re-throw so we know.
        }
    };

    const results = await Promise.allSettled([
        getCountSafe("users", collection(db, COLLECTIONS.USERS)),
        getCountSafe("chats", collection(db, COLLECTIONS.CHATS)),
        getCountSafe("reports", collection(db, COLLECTIONS.REPORTS)),
        getCountSafe("pending_reports", query(collection(db, COLLECTIONS.REPORTS), where("status", "==", "pending"))),
        getCountSafe("banned_users", query(collection(db, COLLECTIONS.USERS), where("isBlocked", "==", true))),
        getCountSafe("connections", collection(db, COLLECTIONS.CONNECTIONS)),
    ]);

    // Check for failures
    const counts = results.map(r => r.status === "fulfilled" ? r.value : 0);
    const errors = results.filter(r => r.status === "rejected");
    if (errors.length > 0) {
        console.error("[Admin] Some stats failed to load", errors);
        // We could throw an error here to alert the UI, or return partial data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        throw new Error("Partial stats failure: " + errors.map((e: any) => e.reason.message).join(", "));
    }

    return {
        totalUsers: counts[0],
        totalChats: counts[1],
        totalReports: counts[2],
        pendingReports: counts[3],
        bannedUsers: counts[4],
        activeConnections: counts[5],
    };
}

// ─── Reports ───────────────────────────────────────────────────────

export interface ReportWithId extends ReportDoc {
    id: string;
}

export async function fetchReports(maxResults = 50): Promise<ReportWithId[]> {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.REPORTS),
        orderBy("createdAt", "desc"),
        limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ReportWithId);
}

export async function updateReportStatus(
    reportId: string,
    status: "reviewed" | "resolved" | "dismissed",
    adminNotes = ""
): Promise<void> {
    const db = requireDb();
    await updateDoc(doc(db, COLLECTIONS.REPORTS, reportId), {
        status,
        adminNotes,
    });
}

// ─── Banned Users ──────────────────────────────────────────────────

export interface BannedUserInfo {
    userId: string;
    displayName: string;
    violationCount: number;
    isBlocked: boolean;
}

export async function fetchBannedUsers(): Promise<BannedUserInfo[]> {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.USERS),
        where("isBlocked", "==", true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
        const data = d.data();
        return {
            userId: d.id,
            displayName: data.displayName || `User ${d.id.slice(0, 8)}`,
            violationCount: data.violationCount ?? 0,
            isBlocked: true,
        };
    });
}

// ─── Manual Ban / Unban ────────────────────────────────────────────

export async function manualBanUser(userId: string): Promise<void> {
    const db = requireDb();
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        isBlocked: true,
    });
}

export async function unbanUser(userId: string): Promise<void> {
    const db = requireDb();
    await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        isBlocked: false,
        violationCount: 0,
    });
}

export async function lookupUser(userId: string): Promise<UserDoc | null> {
    const db = requireDb();
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, userId));
    if (!snap.exists()) return null;
    return { ...snap.data(), userId: snap.id } as UserDoc;
}

export async function getAllUsers(limitCount = 100): Promise<UserDoc[]> {
    const db = requireDb();
    // Order by lastActive desc to see online users first
    const q = query(
        collection(db, COLLECTIONS.USERS),
        orderBy("lastActiveAt", "desc"),
        limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), userId: d.id } as UserDoc));
}

/**
 * Delete a user profile completely.
 * Note: This does not delete their messages or chats, just the user logic.
 */
import { deleteDoc } from "firebase/firestore";

export async function deleteUserProfile(userId: string): Promise<void> {
    const db = requireDb();
    await deleteDoc(doc(db, COLLECTIONS.USERS, userId));
}
