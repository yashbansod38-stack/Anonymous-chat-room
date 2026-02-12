// src/lib/firebase.ts
// Client-only Firebase initialization with modular v9 SDK.
// This module is safe to import anywhere — it returns null on the server
// and lazily initializes on the client.

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { firebaseConfig } from "@/config/firebase";

function initFirebase(): {
    app: FirebaseApp;
    auth: Auth;
    db: Firestore;
} | null {
    // Guard: only initialize on the client
    if (typeof window === "undefined") return null;

    // Guard: skip init if no API key is configured (avoids crash during build)
    if (!firebaseConfig.apiKey) {
        console.warn(
            "[Firebase] No API key found. Fill in .env.local to enable Firebase."
        );
        return null;
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    return { app, auth, db };
}

// Lazy singleton — initialized once on first client-side access
let _firebase: ReturnType<typeof initFirebase> = null;

export function getFirebaseServices() {
    if (!_firebase) {
        _firebase = initFirebase();
    }
    return _firebase;
}

// Convenience getters (may return null on server or if config is missing)
export function getFirebaseAuth(): Auth | null {
    return getFirebaseServices()?.auth ?? null;
}

export function getFirebaseDb(): Firestore | null {
    return getFirebaseServices()?.db ?? null;
}
