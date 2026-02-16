import { Timestamp } from "firebase/firestore";

// ─── Enums & Literals ──────────────────────────────────────────────

export type ModerationStatus = "pending" | "approved" | "rejected";

export type ChatStatus = "active" | "ended" | "reported";

export type ReportReason =
    | "harassment"
    | "spam"
    | "hate_speech"
    | "inappropriate_content"
    | "threats"
    | "other";

export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

export type ViolationType =
    | "toxic_message"
    | "spam"
    | "harassment"
    | "ban_evasion"
    | "other";

export type ViolationAction =
    | "warning"
    | "message_removed"
    | "temporary_block"
    | "permanent_block";

// ─── Firestore Timestamp helper ────────────────────────────────────

/** Firestore stores timestamps as Timestamp objects; this alias makes types clearer. */
export type FirestoreTimestamp = Timestamp;

// ─── /users/{userId} ───────────────────────────────────────────────

export interface UserDoc {
    /** Firebase Auth UID (also the document ID) */
    userId: string;
    /** Whether the user is currently blocked from sending messages */
    isBlocked: boolean;
    /** Cumulative count of moderation violations */
    violationCount: number;
    /** When the anonymous account was created */
    createdAt: FirestoreTimestamp;
    /** Last time the user was active */
    lastActiveAt: FirestoreTimestamp;
    /** Optional display name (auto-generated) */
    displayName: string;
    /** Whether the account is anonymous */
    isAnonymous: boolean;
    /** UIDs of users this user has blocked (prevents future matching) */
    blockedUsers: string[];
}

// ─── /chats/{chatId} ──────────────────────────────────────────────

export interface ChatDoc {
    /** Auto-generated document ID */
    id: string;
    /** Array of exactly two participant UIDs */
    participants: [string, string];
    /** Current status of the chat */
    status: ChatStatus;
    /** When the chat was created */
    createdAt: FirestoreTimestamp;
    /** When the last message was sent */
    lastMessageAt: FirestoreTimestamp;
    /** Preview of the last message (truncated) */
    lastMessagePreview: string;
    /** UID of the last message sender */
    lastMessageSenderId: string;
    /** Total number of messages in this chat */
    messageCount: number;
    /** Map of userId to last typing timestamp */
    typing?: Record<string, FirestoreTimestamp | { seconds: number; nanoseconds: number }>;
    /** Map of userId to last read timestamp */
    lastRead?: Record<string, FirestoreTimestamp | { seconds: number; nanoseconds: number }>;
}

// ─── /chats/{chatId}/messages/{messageId} ──────────────────────────

export interface MessageDoc {
    /** Auto-generated document ID */
    id: string;
    /** UID of the sender */
    senderId: string;
    /** UID of the receiver */
    receiverId: string;
    /** Message text content */
    content: string;
    /** When the message was sent */
    createdAt: FirestoreTimestamp;
    /** Content moderation status */
    moderationStatus: ModerationStatus;
    /** AI-generated toxicity score (0.0 = safe, 1.0 = toxic) */
    toxicityScore: number;
    /** Whether the message has been soft-deleted */
    isDeleted: boolean;
    /** When the message was edited (null if never) */
    editedAt: FirestoreTimestamp | null;
    /** Message type (default: text) */
    type?: "text" | "encrypted";
    /** Initialization Vector (if encrypted) */
    iv?: string;
}

// ─── /reports/{reportId} ──────────────────────────────────────────

export interface ReportDoc {
    /** Auto-generated document ID */
    id: string;
    /** UID of the user who filed the report */
    reporterId: string;
    /** UID of the user being reported */
    reportedUserId: string;
    /** ID of the chat where the incident occurred */
    chatId: string;
    /** ID of the specific message being reported (optional) */
    messageId: string | null;
    /** Category of the report */
    reason: ReportReason;
    /** Free-text description from the reporter */
    description: string;
    /** Current review status */
    status: ReportStatus;
    /** When the report was filed */
    createdAt: FirestoreTimestamp;
    /** When the report was reviewed (null if not yet) */
    reviewedAt: FirestoreTimestamp | null;
    /** UID of the admin who reviewed (null if not yet) */
    reviewedBy: string | null;
    /** Admin notes after review */
    adminNotes: string;
}

// ─── /violations/{violationId} ────────────────────────────────────

export interface ViolationDoc {
    /** Auto-generated document ID */
    id: string;
    /** UID of the violating user */
    userId: string;
    /** Type of violation */
    type: ViolationType;
    /** Action taken in response */
    action: ViolationAction;
    /** ID of the related message (if applicable) */
    messageId: string | null;
    /** ID of the related chat (if applicable) */
    chatId: string | null;
    /** ID of the originating report (if applicable) */
    reportId: string | null;
    /** AI toxicity score that triggered this (if auto-detected) */
    toxicityScore: number | null;
    /** Human-readable reason / notes */
    reason: string;
    /** When the violation was recorded */
    createdAt: FirestoreTimestamp;
    /** If temporary_block, when the block expires */
    expiresAt: FirestoreTimestamp | null;
}

// ─── Firestore collection name constants ──────────────────────────

export const COLLECTIONS = {
    USERS: "users",
    CHATS: "chats",
    MESSAGES: "messages", // subcollection: /chats/{chatId}/messages
    REPORTS: "reports",
    VIOLATIONS: "violations",
    MATCH_QUEUE: "matchQueue",
    CONNECTIONS: "connections",
    CONNECTION_REQUESTS: "connectionRequests",
} as const;

// ─── Matching System ──────────────────────────────────────────────

export type MatchQueueStatus = "waiting" | "matched" | "cancelled";

export type ConnectionRequestStatus = "pending" | "accepted" | "declined";

export type ConnectionStatus = "active" | "blocked";

/** /matchQueue/{docId} — Users waiting to be matched */
export interface MatchQueueDoc {
    id: string;
    /** UID of the waiting user */
    userId: string;
    /** Current status in the queue */
    status: MatchQueueStatus;
    /** When they entered the queue */
    createdAt: FirestoreTimestamp;
    /** UID they were matched with (null until matched) */
    matchedWith: string | null;
    /** Chat ID created from the match (null until matched) */
    chatId: string | null;
    /** UIDs this user was recently matched with (prevent immediate rematch) */
    recentMatches: string[];
}

/** /connectionRequests/{docId} — "Connect" friend requests */
export interface ConnectionRequestDoc {
    id: string;
    /** UID of the user who sent the connect request */
    fromUserId: string;
    /** UID of the user receiving the request */
    toUserId: string;
    /** ID of the chat where they met */
    chatId: string;
    /** Current status */
    status: ConnectionRequestStatus;
    /** When the request was sent */
    createdAt: FirestoreTimestamp;
    /** When the request was responded to */
    respondedAt: FirestoreTimestamp | null;
}

/** /connections/{docId} — Persisted friend connections */
export interface ConnectionDoc {
    id: string;
    /** Both user UIDs */
    participants: [string, string];
    /** The original chat ID where they connected */
    chatId: string;
    /** Connection status */
    status: ConnectionStatus;
    /** When the connection was established */
    createdAt: FirestoreTimestamp;
    /** Display names at time of connection */
    displayNames: Record<string, string>;
}

// ─── Input types (for creating documents — id & timestamps omitted) ─

export type CreateUserInput = Omit<UserDoc, "createdAt" | "lastActiveAt">;
export type CreateChatInput = Omit<ChatDoc, "id" | "createdAt" | "lastMessageAt" | "messageCount">;
export type CreateMessageInput = Omit<MessageDoc, "id" | "createdAt" | "isDeleted" | "editedAt">;
export type CreateReportInput = Omit<ReportDoc, "id" | "createdAt" | "reviewedAt" | "reviewedBy" | "adminNotes" | "status">;
export type CreateViolationInput = Omit<ViolationDoc, "id" | "createdAt">;
export type CreateMatchQueueInput = Omit<MatchQueueDoc, "id" | "createdAt" | "matchedWith" | "chatId">;
export type CreateConnectionRequestInput = Omit<ConnectionRequestDoc, "id" | "createdAt" | "respondedAt" | "status">;
export type CreateConnectionInput = Omit<ConnectionDoc, "id" | "createdAt">;

