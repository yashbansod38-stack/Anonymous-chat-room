// src/lib/firestore.ts
// Firestore helper utilities with realtime listeners (modular v9 SDK).
// All functions lazily access the Firestore instance to avoid SSR initialization.

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    type DocumentData,
    type QueryConstraint,
    type Unsubscribe,
    type WhereFilterOp,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";

function requireDb() {
    const db = getFirebaseDb();
    if (!db) throw new Error("Firestore is not initialized. Check Firebase config.");
    return db;
}

// ─── Create ────────────────────────────────────────────────────────

/**
 * Add a new document to a collection.
 * Returns the auto-generated document ID.
 */
export async function createDocument(
    collectionName: string,
    data: DocumentData
): Promise<string> {
    const db = requireDb();
    const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
    });
    return docRef.id;
}

// ─── Read ──────────────────────────────────────────────────────────

/**
 * Fetch a single document by ID.
 */
export async function getDocument(
    collectionName: string,
    docId: string
): Promise<DocumentData | null> {
    const db = requireDb();
    const snap = await getDoc(doc(db, collectionName, docId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Fetch all documents from a collection with optional constraints.
 */
export async function getDocuments(
    collectionName: string,
    constraints: QueryConstraint[] = []
): Promise<DocumentData[]> {
    const db = requireDb();
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Update ────────────────────────────────────────────────────────

/**
 * Update fields on an existing document.
 */
export async function updateDocument(
    collectionName: string,
    docId: string,
    data: Partial<DocumentData>
): Promise<void> {
    const db = requireDb();
    await updateDoc(doc(db, collectionName, docId), {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

// ─── Delete ────────────────────────────────────────────────────────

/**
 * Delete a document by ID.
 */
export async function removeDocument(
    collectionName: string,
    docId: string
): Promise<void> {
    const db = requireDb();
    await deleteDoc(doc(db, collectionName, docId));
}

// ─── Realtime Listeners ────────────────────────────────────────────

/**
 * Subscribe to realtime updates on an entire collection (with optional constraints).
 * Returns an unsubscribe function.
 *
 * @example
 * const unsub = subscribeToCollection("messages", (msgs) => setMessages(msgs), [
 *   orderBy("createdAt", "asc"),
 *   limit(100),
 * ]);
 */
export function subscribeToCollection(
    collectionName: string,
    callback: (data: DocumentData[]) => void,
    constraints: QueryConstraint[] = []
): Unsubscribe {
    const db = requireDb();
    const q = query(collection(db, collectionName), ...constraints);
    return onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(docs);
    });
}

/**
 * Subscribe to realtime updates on a single document.
 * Returns an unsubscribe function.
 */
export function subscribeToDocument(
    collectionName: string,
    docId: string,
    callback: (data: DocumentData | null) => void
): Unsubscribe {
    const db = requireDb();
    return onSnapshot(doc(db, collectionName, docId), (snap) => {
        callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
}

// ─── Re-export common query helpers for convenience ────────────────
export { where, orderBy, limit, serverTimestamp, type WhereFilterOp };
