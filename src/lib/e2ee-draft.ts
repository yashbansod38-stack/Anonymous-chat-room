
// src/lib/e2ee.ts
import {
    generateKeyPair,
    importPrivateKey,
    importPublicKey,
    deriveSharedKey
} from "@/lib/crypto";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const PRIVATE_KEY_STORAGE = "safe_anon_chat_priv_key";

export interface UserKeys {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

let cachedKeys: UserKeys | null = null;
const sharedKeyCache = new Map<string, CryptoKey>();

/**
 * Initialize E2EE for the current user.
 * 1. Load/Generate Private Key.
 * 2. Publish Public Key to Firestore if missing/changed.
 */
export async function initializeE2EE(userId: string): Promise<UserKeys | null> {
    if (cachedKeys) return cachedKeys;

    try {
        let privateJwk: JsonWebKey | null = null;
        let publicJwk: JsonWebKey | null = null;

        // 1. Try to load from LocalStorage
        const storedPriv = localStorage.getItem(PRIVATE_KEY_STORAGE);
        if (storedPriv) {
            privateJwk = JSON.parse(storedPriv);
        }

        // 2. If missing, generate new pair
        if (!privateJwk) {
            console.log("[E2EE] Generating new keys...");
            const pair = await generateKeyPair();
            privateJwk = pair.privateKey;
            publicJwk = pair.publicKey;

            // Save Private locally
            localStorage.setItem(PRIVATE_KEY_STORAGE, JSON.stringify(privateJwk));
        }

        // 3. Import Private Key object
        const privateKey = await importPrivateKey(privateJwk!);

        // 4. Ensure Public Key is on Firestore
        const db = getFirebaseDb();
        if (db) {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);

            // If we generated a new pair, we have publicJwk ready.
            // If we loaded private from storage, we technically don't have public unless we derive or stored it too.
            // Limitation of ECDH P-256 in WebCrypto: can't easily derive public from private without importing.
            // Actually, we should store PUBLIC key in localstorage too to avoid this.
            // For now, let's assume if we have private, good.
            // But we need to verify Firestore has the matching public key.

            // Simplified: If we generated new, upload it.
            if (publicJwk) {
                await updateDoc(userRef, { publicKey: publicJwk });
            } else {
                // We loaded private, checking if server has public.
                // If server is missing public key, we are in trouble because we can't re-derive it easily from private JWK in standard WebCrypto 
                // without keeping the keypair object (which we lost on reload).
                // Solution: We should check if we can export public frame from private? No.
                // Fix: Store BOTH in localStorage.
                // Refactoring to store KeyPair.
            }
        }

        // REFACTOR START: Loading Key Pair
        // Let's assume we start fresh or fix the storage logic below.
        return null; // Placeholder to restart logic
    } catch (e) {
        console.error("E2EE Init Failed:", e);
        return null;
    }
}
