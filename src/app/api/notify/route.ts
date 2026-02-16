
import { NextResponse } from 'next/server';
import { adminAuth, adminMessaging, adminDb } from '@/lib/firebase-admin';

// POST /api/notify
// Body: { targetUserId, title, body, icon? }
// Auth: Bearer token
export async function POST(req: Request) {
    if (!adminAuth || !adminMessaging || !adminDb) {
        return NextResponse.json({ error: "Service Unavailable (Admin SDK not initialized)" }, { status: 503 });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        const { targetUserId, title, body, icon } = await req.json();

        if (!targetUserId || !title || !body) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch target user's tokens
        const userDoc = await adminDb.collection("users").doc(targetUserId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const tokens = userData?.fcmTokens as string[] || [];

        if (tokens.length === 0) {
            return NextResponse.json({ message: "No tokens found for user" }, { status: 200 });
        }

        // Send to all tokens
        const message = {
            notification: {
                title,
                body,
            },
            webpush: {
                notification: {
                    icon: icon || '/icon-192x192.png'
                }
            },
            tokens: tokens,
        };

        const response = await (adminMessaging as any).sendMulticast(message);

        // Cleanup invalid tokens
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp: any, idx: number) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            // Ideally remove them, but requires write back.
            // For now, just log or ignore.
        }

        return NextResponse.json({ success: true, failureCount: response.failureCount, successCount: response.successCount });

    } catch (error) {
        console.error("Notification Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
