"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { subscribeToMessages } from "@/lib/messages";
import { sendMessage } from "@/lib/messages";
import type { ConnectionDoc, MessageDoc } from "@/types";
import ChatBubble from "@/components/chat/ChatBubble";

interface FriendChatWindowProps {
    connection: ConnectionDoc;
    currentUserId: string;
    onClose?: () => void;
}

export default function FriendChatWindow({
    connection,
    currentUserId,
    onClose,
}: FriendChatWindowProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState<MessageDoc[]>([]);
    const [input, setInput] = useState("");
    const [unread, setUnread] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(0);

    const friendId = connection.participants.find((p) => p !== currentUserId) || "";
    const friendName =
        connection.displayNames?.[friendId] ||
        `User ${friendId.slice(0, 6)}`;

    // Subscribe to messages
    useEffect(() => {
        const unsub = subscribeToMessages(connection.chatId, (msgs) => {
            setMessages(msgs);
            // Track unread when minimized
            if (!isExpanded && msgs.length > prevMessageCountRef.current) {
                setUnread((u) => u + (msgs.length - prevMessageCountRef.current));
            }
            prevMessageCountRef.current = msgs.length;
        });
        return () => unsub();
    }, [connection.chatId, isExpanded]);

    // Auto-scroll on expand or new messages
    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            setUnread(0);
        }
    }, [isExpanded, messages.length]);

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;
        const text = input.trim();
        setInput("");
        try {
            await sendMessage(connection.chatId, currentUserId, friendId, text);
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    }, [input, connection.chatId, currentUserId, friendId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div
            className={`
        flex flex-col overflow-hidden rounded-t-xl border border-gray-200 bg-white shadow-xl
        transition-all duration-300 ease-in-out dark:border-gray-700 dark:bg-surface-dark
        ${isExpanded ? "h-[400px] w-72 sm:w-80" : "h-12 w-56 sm:w-64"}
      `}
        >
            {/* Header — always visible */}
            <div
                className="flex h-12 shrink-0 items-center justify-between gap-2 bg-primary-600 px-3 text-white transition-colors hover:bg-primary-700 cursor-pointer"
                onClick={() => setIsExpanded((e) => !e)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                        {friendName.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate text-sm font-medium">{friendName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {unread > 0 && !isExpanded && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">
                            {unread}
                        </span>
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded((prev) => !prev);
                        }}
                        className="p-1 hover:bg-primary-500 rounded"
                    >
                        <svg
                            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                    {/* Close Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose?.();
                        }}
                        className="p-1 hover:bg-primary-500 rounded"
                        title="Close Chat"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Expanded body */}
            {
                isExpanded && (
                    <>
                        {/* Messages */}
                        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
                            {messages.length === 0 && (
                                <p className="py-8 text-center text-xs text-gray-400">
                                    Start the conversation!
                                </p>
                            )}
                            {messages.map((msg) => (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg}
                                    isOwn={msg.senderId === currentUserId}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="border-t border-gray-200 p-2 dark:border-gray-700">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Message…"
                                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none transition-colors focus:border-primary-400 dark:border-gray-700 dark:bg-surface-darker dark:text-gray-200"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </>
                )
            }
        </div >
    );
}
