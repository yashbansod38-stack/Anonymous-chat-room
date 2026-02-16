
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    // Handle private key newlines
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                }),
            });
            console.log("[Admin] Initialized successfully.");
        } else {
            console.warn("[Admin] Missing FIREBASE_PRIVATE_KEY or FIREBASE_CLIENT_EMAIL. Admin features (notifications) will be disabled.");
        }
    } catch (error) {
        console.error("[Admin] Initialization failed:", error);
    }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminMessaging = admin.apps.length ? admin.messaging() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
