// src/lib/report.ts
// Report service — file reports against users/messages.

import {
    collection,
    doc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS, type ReportReason } from "@/types";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore not initialized");
    return db;
}

export interface ReportInput {
    reporterId: string;
    reportedUserId: string;
    chatId: string;
    messageId?: string | null;
    reason: ReportReason;
    description?: string;
}

/**
 * File a report against a user or specific message.
 */
export async function fileReport(input: ReportInput): Promise<string> {
    const db = requireDb();
    const reportRef = doc(collection(db, COLLECTIONS.REPORTS));

    await setDoc(reportRef, {
        reporterId: input.reporterId,
        reportedUserId: input.reportedUserId,
        chatId: input.chatId,
        messageId: input.messageId || null,
        reason: input.reason,
        description: input.description || "",
        status: "pending",
        createdAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null,
        adminNotes: "",
    });

    return reportRef.id;
}

/**
 * Reason labels for display in the UI.
 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
    harassment: "Harassment or bullying",
    spam: "Spam or scam",
    hate_speech: "Hate speech",
    inappropriate_content: "Inappropriate content",
    threats: "Threats or violence",
    other: "Other",
};
