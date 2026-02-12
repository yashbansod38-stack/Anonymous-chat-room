"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToConnections } from "@/lib/connections";
import type { ConnectionDoc } from "@/types";
import FriendChatWindow from "@/components/chat/FriendChatWindow";

/**
 * Persistent friend chat sidebar — renders in the bottom-right corner.
 * Each connected friend appears as a minimizable chat window.
 * Stacks horizontally from right to left.
 */
export default function FriendChatSidebar() {
    const { uid } = useAuth();
    const [connections, setConnections] = useState<ConnectionDoc[]>([]);

    useEffect(() => {
        if (!uid) return;
        const unsub = subscribeToConnections(uid, setConnections);
        return () => unsub();
    }, [uid]);

    if (!uid || connections.length === 0) return null;

    return (
        <div className="fixed bottom-0 right-4 z-40 flex items-end gap-2">
            {connections.map((conn) => (
                <FriendChatWindow
                    key={conn.id}
                    connection={conn}
                    currentUserId={uid}
                />
            ))}
        </div>
    );
}
