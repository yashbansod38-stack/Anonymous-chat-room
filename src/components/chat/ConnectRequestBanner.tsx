"use client";

import { useState, useEffect } from "react";
import { subscribeToIncomingRequests, respondToConnectRequest } from "@/lib/connections";
import type { ConnectionRequestDoc } from "@/types";
import Button from "@/components/ui/Button";

interface ConnectRequestBannerProps {
    userId: string;
    chatId: string;
}

export default function ConnectRequestBanner({
    userId,
    chatId,
}: ConnectRequestBannerProps) {
    const [requests, setRequests] = useState<ConnectionRequestDoc[]>([]);

    useEffect(() => {
        const unsub = subscribeToIncomingRequests(userId, (incoming) => {
            // Only show requests for this chat
            setRequests(incoming.filter((r) => r.chatId === chatId));
        });
        return () => unsub();
    }, [userId, chatId]);

    const handleRespond = async (requestId: string, accept: boolean) => {
        try {
            await respondToConnectRequest(requestId, accept, {});
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
        } catch (error) {
            console.error("Failed to respond to connect request:", error);
        }
    };

    if (requests.length === 0) return null;

    return (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-3 dark:border-yellow-900/50 dark:bg-yellow-950/20">
            {requests.map((req) => (
                <div
                    key={req.id}
                    className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="flex items-center gap-2">
                        <svg
                            className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                            />
                        </svg>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                            This user wants to connect with you!
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleRespond(req.id, true)}
                        >
                            Accept
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRespond(req.id, false)}
                        >
                            Decline
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
