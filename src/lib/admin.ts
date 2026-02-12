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

    const [usersSnap, chatsSnap, reportsSnap, pendingSnap, bannedSnap, connectionsSnap] =
        await Promise.all([
            getCountFromServer(collection(db, COLLECTIONS.USERS)),
            getCountFromServer(collection(db, COLLECTIONS.CHATS)),
            getCountFromServer(collection(db, COLLECTIONS.REPORTS)),
            getCountFromServer(
                query(collection(db, COLLECTIONS.REPORTS), where("status", "==", "pending"))
            ),
            getCountFromServer(
                query(collection(db, COLLECTIONS.USERS), where("isBlocked", "==", true))
            ),
            getCountFromServer(collection(db, COLLECTIONS.CONNECTIONS)),
        ]);

    return {
        totalUsers: usersSnap.data().count,
        totalChats: chatsSnap.data().count,
        totalReports: reportsSnap.data().count,
        pendingReports: pendingSnap.data().count,
        bannedUsers: bannedSnap.data().count,
        activeConnections: connectionsSnap.data().count,
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
