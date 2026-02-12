// src/lib/connections.ts
// Connection (friend) system — send connect requests, accept, list friends.

import {
    collection,
    doc,
    setDoc,
    updateDoc,
    getDocs,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    type Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import {
    COLLECTIONS,
    type ConnectionRequestDoc,
    type ConnectionDoc,
} from "@/types";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore not initialized");
    return db;
}

// ─── Send Connect Request ─────────────────────────────────────────

export async function sendConnectRequest(
    fromUserId: string,
    toUserId: string,
    chatId: string
): Promise<string> {
    const db = requireDb();
    const reqRef = doc(collection(db, COLLECTIONS.CONNECTION_REQUESTS));

    await setDoc(reqRef, {
        fromUserId,
        toUserId,
        chatId,
        status: "pending",
        createdAt: serverTimestamp(),
        respondedAt: null,
    });

    return reqRef.id;
}

// ─── Respond to Connect Request ───────────────────────────────────

export async function respondToConnectRequest(
    requestId: string,
    accept: boolean,
    displayNames: Record<string, string>
): Promise<void> {
    const db = requireDb();
    const reqRef = doc(db, COLLECTIONS.CONNECTION_REQUESTS, requestId);

    await updateDoc(reqRef, {
        status: accept ? "accepted" : "declined",
        respondedAt: serverTimestamp(),
    });

    // If accepted, create the connection document
    if (accept) {
        const { getDoc } = await import("firebase/firestore");
        const reqSnap = await getDoc(reqRef);
        if (!reqSnap.exists()) return;

        const reqData = reqSnap.data() as ConnectionRequestDoc;

        const connRef = doc(collection(db, COLLECTIONS.CONNECTIONS));
        await setDoc(connRef, {
            participants: [reqData.fromUserId, reqData.toUserId],
            chatId: reqData.chatId,
            status: "active",
            createdAt: serverTimestamp(),
            displayNames,
        });
    }
}

// ─── Get Pending Requests for User ────────────────────────────────

export async function getPendingRequests(
    userId: string
): Promise<ConnectionRequestDoc[]> {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.CONNECTION_REQUESTS),
        where("toUserId", "==", userId),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ConnectionRequestDoc);
}

// ─── Listen to Connections (Friends) ──────────────────────────────

export function subscribeToConnections(
    userId: string,
    callback: (connections: ConnectionDoc[]) => void
): Unsubscribe {
    const db = requireDb();
    // Firestore doesn't support array-contains with compound queries easily,
    // so we listen to all connections and filter client-side for now.
    const q = query(
        collection(db, COLLECTIONS.CONNECTIONS),
        where("status", "==", "active")
    );

    return onSnapshot(q, (snapshot) => {
        const connections = snapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }) as ConnectionDoc)
            .filter((c) => c.participants.includes(userId));
        callback(connections);
    });
}

// ─── Listen for Incoming Connect Requests ─────────────────────────

export function subscribeToIncomingRequests(
    userId: string,
    callback: (requests: ConnectionRequestDoc[]) => void
): Unsubscribe {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.CONNECTION_REQUESTS),
        where("toUserId", "==", userId),
        where("status", "==", "pending")
    );

    return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as ConnectionRequestDoc
        );
        callback(requests);
    });
}

// ─── Check Existing Connection ────────────────────────────────────

export async function checkExistingConnection(
    userId1: string,
    userId2: string
): Promise<boolean> {
    const db = requireDb();
    const q = query(
        collection(db, COLLECTIONS.CONNECTIONS),
        where("status", "==", "active")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.some((d) => {
        const data = d.data();
        return (
            data.participants.includes(userId1) &&
            data.participants.includes(userId2)
        );
    });
}
