
import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

export function useNotifications() {
    const { uid } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) return;

        try {
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm === 'granted' && uid) {
                const services = getFirebaseServices();
                if (!services?.app) return;

                const messaging = getMessaging(services.app);
                const currentToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Optional if using default, but reliable with key
                });

                if (currentToken) {
                    console.log("FCM Token:", currentToken);
                    // Save to user profile
                    const db = getFirebaseDb();
                    if (db) {
                        await updateDoc(doc(db, 'users', uid), {
                            fcmTokens: arrayUnion(currentToken)
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Notification permission error:", error);
        }
    };

    // Listen for foreground messages
    useEffect(() => {
        if (permission === 'granted') {
            const services = getFirebaseServices();
            if (!services?.app) return;
            const messaging = getMessaging(services.app);

            const unsubscribe = onMessage(messaging, (payload) => {
                console.log("Foreground Message:", payload);
                // Optionally show a toast or browser notification if desired (browser might block manual notification in focus)
                // But typically UI updates are enough.
                // However, user asked for "Push Notifications".
                if (payload.notification) {
                    new Notification(payload.notification.title || 'New Message', {
                        body: payload.notification.body,
                        icon: '/icon-192x192.png'
                    });
                }
            });
            return () => unsubscribe();
        }
    }, [permission]);

    return { permission, requestPermission };
}
