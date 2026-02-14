import { useEffect, useState } from "react";
import { subscribeToConnections } from "@/lib/connections";
import type { ConnectionDoc } from "@/types";
import { getDisplayName } from "@/lib/userProfile";

interface ConnectedChatsListProps {
    currentUserId: string;
    onSelectChat: (chatId: string, partnerId: string, partnerName: string) => void;
    activeChatId?: string | null;
}

interface ConnectionWithMeta extends ConnectionDoc {
    partnerId: string;
    partnerName: string;
}

export default function ConnectedChatsList({
    currentUserId,
    onSelectChat,
    activeChatId,
}: ConnectedChatsListProps) {
    const [connections, setConnections] = useState<ConnectionWithMeta[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = subscribeToConnections(currentUserId, async (data) => {
            const enriched = await Promise.all(
                data.map(async (conn) => {
                    // Identify partner
                    const partnerId = conn.participants.find((p) => p !== currentUserId) || "";
                    // If displayNames is stored in connection, use it, otherwise fetch
                    let partnerName = conn.displayNames?.[partnerId];
                    if (!partnerName) {
                        try {
                            partnerName = await getDisplayName(partnerId);
                        } catch {
                            partnerName = "Unknown";
                        }
                    }

                    return { ...conn, partnerId, partnerName };
                })
            );
            setConnections(enriched);
            setLoading(false);
        });

        return () => unsub();
    }, [currentUserId]);

    if (loading) {
        return (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading chats...
            </div>
        );
    }

    if (connections.length === 0) {
        return (
            <div className="p-4 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No connected friends yet.
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Match with people and click &quot;Connect&quot; to add them here!
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col space-y-1 p-2">
            <h3 className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Friends
            </h3>
            {connections.map((conn) => {
                const isActive = conn.chatId === activeChatId;
                return (
                    <button
                        key={conn.id}
                        onClick={() =>
                            onSelectChat(conn.chatId, conn.partnerId, conn.partnerName)
                        }
                        className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all hover:bg-gray-100 dark:hover:bg-gray-800 ${isActive
                            ? "bg-primary-50 ring-1 ring-primary-200 dark:bg-primary-900/20 dark:ring-primary-900"
                            : ""
                            }`}
                    >
                        {/* Avatar Placeholder */}
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase transition-colors ${isActive
                                ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300"
                                : "bg-gray-200 text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-gray-700 dark:text-gray-300 dark:group-hover:bg-primary-900/50 dark:group-hover:text-primary-400"
                                }`}
                        >
                            {conn.partnerName.slice(0, 2)}
                        </div>

                        <div className="flex-1 overflow-hidden">
                            <p
                                className={`truncate text-sm font-medium ${isActive
                                    ? "text-primary-900 dark:text-primary-100"
                                    : "text-gray-900 dark:text-white"
                                    }`}
                            >
                                {conn.partnerName}
                            </p>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {isActive ? "Chatting now..." : "Click to chat"}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
