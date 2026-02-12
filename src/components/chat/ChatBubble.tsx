"use client";

import { useState } from "react";
import type { MessageDoc } from "@/types";

interface ChatBubbleProps {
    message: MessageDoc;
    isOwn: boolean;
    onReport?: (messageId: string) => void;
}

export default function ChatBubble({ message, isOwn, onReport }: ChatBubbleProps) {
    const [showMenu, setShowMenu] = useState(false);

    const time = message.createdAt?.toDate
        ? message.createdAt.toDate().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        })
        : "";

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isOwn) return; // can't report own messages
        e.preventDefault();
        setShowMenu((prev) => !prev);
    };

    return (
        <div
            className={`group flex animate-fade-in ${isOwn ? "justify-end" : "justify-start"}`}
        >
            <div
                className={`
          relative max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
          ${isOwn
                        ? "rounded-br-md bg-primary-600 text-white shadow-md shadow-primary-500/20"
                        : "rounded-bl-md bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    }
        `}
                onContextMenu={handleContextMenu}
            >
                {/* Message content */}
                <p className="break-words">{message.content}</p>

                {/* Timestamp */}
                <p
                    className={`mt-1 text-[10px] ${isOwn
                            ? "text-primary-200"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                >
                    {time}
                </p>

                {/* Moderation badge */}
                {message.moderationStatus === "rejected" && (
                    <span className="mt-1 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600 dark:bg-red-950 dark:text-red-400">
                        Flagged
                    </span>
                )}

                {/* Report button (visible on hover for other's messages) */}
                {!isOwn && onReport && (
                    <button
                        onClick={() => onReport(message.id)}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-400 opacity-0 shadow-md transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:bg-gray-700 dark:hover:bg-red-950"
                        title="Report message"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                        </svg>
                    </button>
                )}

                {/* Context menu */}
                {showMenu && !isOwn && (
                    <div className="absolute left-0 top-full z-10 mt-1 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-surface-dark">
                        <button
                            onClick={() => {
                                onReport?.(message.id);
                                setShowMenu(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                            </svg>
                            Report
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
