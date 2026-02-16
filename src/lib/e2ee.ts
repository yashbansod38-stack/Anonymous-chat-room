
// src/lib/e2ee.ts
import {
    generateKeyPair,
    importPrivateKey,
    importPublicKey,
    deriveSharedKey,
    encryptMessage,
    decryptMessage
} from "@/lib/crypto";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const STORAGE_KEY = "safe_anon_chat_keys"; // Stores { privateJwk, publicJwk }

interface StoredKeyPair {
    privateJwk: JsonWebKey;
    publicJwk: JsonWebKey;
}

let myPrivateKey: CryptoKey | null = null;
const sharedKeyCache = new Map<string, CryptoKey>(); // Valid for session

/**
 * Initialize E2EE for the current user.
 */
export async function initializeE2EE(userId: string): Promise<void> {
    if (myPrivateKey) return;

    try {
        let stored: StoredKeyPair | null = null;
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            stored = JSON.parse(raw);
        }

        let publicJwk: JsonWebKey;
        let privateJwk: JsonWebKey;

        if (stored) {
            publicJwk = stored.publicJwk;
            privateJwk = stored.privateJwk;
        } else {
            console.log("[E2EE] Generating new KeyPair...");
            const pair = await generateKeyPair();
            publicJwk = pair.publicKey;
            privateJwk = pair.privateKey;
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ publicJwk, privateJwk }));
        }

        // Import Private Key for Use
        myPrivateKey = await importPrivateKey(privateJwk);

        // Upload Public Key to Firestore (Idempotent-ish)
        const db = getFirebaseDb();
        if (db) { // Check if we need to upload? Optimistically update to ensure it's there.
            // Only update if changed or missing to save writes? 
            // Let's just update for now to be safe.
            await updateDoc(doc(db, "users", userId), { publicKey: publicJwk });
        }

    } catch (e) {
        console.error("[E2EE] Init Failed:", e);
    }
}

/**
 * Get Shared Key for a remote user.
 * Fetches their Public Key from Firestore, derives shared secret.
 */
export async function getSharedKey(remoteUserId: string): Promise<CryptoKey | null> {
    if (!myPrivateKey) return null;
    if (sharedKeyCache.has(remoteUserId)) return sharedKeyCache.get(remoteUserId)!;

    const db = getFirebaseDb();
    if (!db) return null;

    try {
        const docSnap = await getDoc(doc(db, "users", remoteUserId));
        if (!docSnap.exists()) return null;

        const data = docSnap.data();
        if (!data?.publicKey) return null; // User not E2EE ready

        const remotePublic = await importPublicKey(data.publicKey);
        const shared = await deriveSharedKey(myPrivateKey, remotePublic);

        sharedKeyCache.set(remoteUserId, shared);
        return shared;
    } catch (e) {
        console.error(`[E2EE] Failed to derive key for ${remoteUserId}:`, e);
        return null;
    }
}

// Re-export crypto functions for convenience
export { encryptMessage, decryptMessage };
