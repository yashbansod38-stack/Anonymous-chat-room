"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeToConnections } from "@/lib/connections";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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

    // Mobile Polish: Collapsible Sidebar
    const isMobile = useMediaQuery("(max-width: 768px)");
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Auto-collapse on mobile initial load
    useEffect(() => {
        if (isMobile) setIsCollapsed(true);
    }, [isMobile]);

    useEffect(() => {
        if (!uid) return;
        const unsub = subscribeToConnections(uid, setConnections);
        return () => unsub();
    }, [uid]);

    if (!uid || connections.length === 0) return null;

    if (isCollapsed) {
        return (
            <button
                onClick={() => setIsCollapsed(false)}
                className="fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {/* Badge for number of chats */}
                <span className="absolute -right-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold ring-2 ring-white">
                    {connections.length}
                </span>
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 right-4 z-40 flex flex-col-reverse items-end gap-2 sm:flex-row sm:items-end">
            {/* Collapse Button */}
            <div className="flex gap-2">
                <button
                    onClick={() => setIsCollapsed(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-dark/50 text-white backdrop-blur-md transition-colors hover:bg-surface-dark/80 dark:bg-gray-700/50 dark:hover:bg-gray-700/80 mb-2 sm:mb-0 shadow-sm"
                    title="Collapse Chats"
                >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end overflow-x-auto max-w-[100vw] px-2 sm:overflow-visible sm:px-0 scrollbar-hide py-2 sm:py-0">
                {connections.map((conn) => (
                    <FriendChatWindow
                        key={conn.id}
                        connection={conn}
                        currentUserId={uid}
                    />
                ))}
            </div>
        </div>
    );
}
