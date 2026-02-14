/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Timestamp, onSnapshot, doc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/types";
import { joinMatchQueue, leaveMatchQueue, listenForMatch, endChat } from "@/lib/matchmaking";
import { sendMessage, subscribeToMessages } from "@/lib/messages";
import { sendConnectRequest, checkExistingConnection } from "@/lib/connections";
import { moderateMessage, incrementViolationCount, getWarningMessage } from "@/lib/moderation";
import { enforceBanThreshold, getRemainingWarnings } from "@/lib/ban";
import { blockUser } from "@/lib/block";
import { getDisplayName } from "@/lib/userProfile";
import { useBlockedStatus } from "@/hooks/useBlockedStatus";
import { useTyping } from "@/hooks/useTyping";
import { useSound } from "@/hooks/useSound";
import { useReadReceipts } from "@/hooks/useReadReceipts";
import type { MessageDoc } from "@/types";
import Button from "@/components/ui/Button";
import ChatBubble from "@/components/chat/ChatBubble";
import ConnectRequestBanner from "@/components/chat/ConnectRequestBanner";
import ReportModal from "@/components/chat/ReportModal";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import ConnectedChatsList from "@/components/chat/ConnectedChatsList";
import Avatar from "@/components/ui/Avatar";

type ChatState = "idle" | "searching" | "matched" | "ended";

export default function ChatPage() {
    const { uid, loading: authLoading, hasProfile, displayName, setDisplayName } = useAuth();
    const { isBlocked, violationCount, loading: banLoading, refresh: refreshBanStatus } = useBlockedStatus();

    const [chatState, setChatState] = useState<ChatState>("idle");
    const [chatId, setChatId] = useState<string | null>(null);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const [queueDocId, setQueueDocId] = useState<string | null>(null);
    const [messages, setMessages] = useState<MessageDoc[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [recentMatches, setRecentMatches] = useState<string[]>([]);
    const [connectSent, setConnectSent] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [searchDots, setSearchDots] = useState("");
    const [warningMessage, setWarningMessage] = useState<string | null>(null);
    const [isModerating, setIsModerating] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportMessageId, setReportMessageId] = useState<string | null>(null);
    const [userBlockedPartner, setUserBlockedPartner] = useState(false);
    const [partnerName, setPartnerName] = useState<string>("Anonymous");
    const [onboardingOpen, setOnboardingOpen] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const matchListenerRef = useRef<(() => void) | null>(null);

    // Animated searching dots
    useEffect(() => {
        if (chatState !== "searching") return;
        const interval = setInterval(() => {
            setSearchDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);
        return () => clearInterval(interval);
    }, [chatState]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Profile Edit Listener
    useEffect(() => {
        const handleOpenProfile = () => setOnboardingOpen(true);
        document.addEventListener("open-profile-settings", handleOpenProfile);
        return () => document.removeEventListener("open-profile-settings", handleOpenProfile);
    }, []);

    // Subscribe to messages when matched
    useEffect(() => {
        if (!chatId) return;
        const unsub = subscribeToMessages(chatId, setMessages);
        return () => unsub();
    }, [chatId]);

    // Check existing connection with partner
    useEffect(() => {
        if (!uid || !partnerId) return;
        checkExistingConnection(uid, partnerId).then(setIsConnected).catch(() => { });
        // Fetch partner's display name
        getDisplayName(partnerId).then(setPartnerName).catch(() => setPartnerName("Anonymous"));
    }, [uid, partnerId]);

    const [showConnectedChats, setShowConnectedChats] = useState(false); // Mobile toggle

    // Persistence: Welcome Back Toast
    useEffect(() => {
        if (hasProfile && displayName && chatState === "idle" && !chatId) {
            const noticed = sessionStorage.getItem("welcome_toast_shown");
            if (!noticed) {
                console.log(`Welcome back, ${displayName}!`);
                sessionStorage.setItem("welcome_toast_shown", "true");
            }
        }
    }, [hasProfile, displayName, chatState, chatId]);

    // Select a chat from the connected list
    const handleSelectChat = useCallback((selectedChatId: string, partnerId: string, partnerName: string) => {
        if (chatState === "searching" && queueDocId) {
            leaveMatchQueue(queueDocId).catch(console.error);
            setQueueDocId(null);
        }
        setChatId(selectedChatId);
        setPartnerId(partnerId);
        setPartnerName(partnerName);
        setChatState("matched");
        setMessages([]); // Will load from Firestore
        setShowConnectedChats(false);
    }, [chatState, queueDocId]);

    const startMatchmaking = useCallback(async () => {
        if (!uid) return;
        setChatState("searching");
        setMessages([]);
        setConnectSent(false);
        setIsConnected(false);
        setUserBlockedPartner(false);

        try {
            // Fetch blocked users for matchmaking
            const { getBlockedUsers } = await import("@/lib/block");
            const blockedUsers = await getBlockedUsers(uid);

            const docId = await joinMatchQueue(uid, recentMatches, blockedUsers);
            setQueueDocId(docId);

            // Listen for match updates
            const unsub = listenForMatch(
                docId,
                (matchedChatId, matchedUserId) => {
                    setChatId(matchedChatId);
                    setPartnerId(matchedUserId);
                    setChatState("matched");
                    setRecentMatches((prev) => [...prev.slice(-4), matchedUserId]);
                    matchListenerRef.current = null;
                    unsub();
                },
                (error) => {
                    console.error("Match listener error:", error);
                    setChatState("idle");
                    matchListenerRef.current = null;
                }
            );
            matchListenerRef.current = unsub;
        } catch (error) {
            console.error("Failed to join queue:", error);
            setChatState("idle");
        }
    }, [uid, recentMatches]);

    const handleStartChat = useCallback(() => {
        if (!uid) return;
        if (!hasProfile) {
            setOnboardingOpen(true);
            return;
        }
        startMatchmaking();
    }, [uid, hasProfile, startMatchmaking]);

    const handleOnboardingComplete = (name: string) => {
        setDisplayName(name);
        setOnboardingOpen(false);
        // Start chat immediately after profile creation
        startMatchmaking();
    };

    const handleCancelSearch = useCallback(async () => {
        // Clean up match listener
        if (matchListenerRef.current) {
            matchListenerRef.current();
            matchListenerRef.current = null;
        }
        if (queueDocId) {
            await leaveMatchQueue(queueDocId).catch(console.error);
        }
        setQueueDocId(null);
        setChatState("idle");
    }, [queueDocId]);

    const { isPeerTyping, handleTyping } = useTyping(chatId, uid);
    const { playSound, toggleMute, isMuted } = useSound();
    const { partnerLastRead, markAsRead } = useReadReceipts(chatId, uid);

    // Play sound on match
    useEffect(() => {
        if (chatState === "matched") {
            playSound("match_found");
        }
    }, [chatState, playSound]);

    // Play sound on new messages
    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.senderId === uid) {
                playSound("message_sent");
            } else {
                playSound("message_received");
                // Mark as read when receiving a new message while active
                if (chatState === "matched") {
                    markAsRead();
                }
            }
        }
    }, [messages, uid, playSound, chatState, markAsRead]);

    // Mark as read when first matching
    useEffect(() => {
        if (chatState === "matched" && chatId) {
            markAsRead();
        }
    }, [chatState, chatId, markAsRead]);

    // Cleanup listener on unmount
    useEffect(() => {
        return () => {
            if (matchListenerRef.current) {
                matchListenerRef.current();
                matchListenerRef.current = null;
            }
            // Play end sound if active
            if (chatState === "matched") {
                playSound("chat_ended");
            }
        };
    }, []);

    // Handle typing input
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        handleTyping();
    };

    const handleSendMessage = useCallback(async () => {
        if (!uid || !chatId || !partnerId || !inputValue.trim()) return;
        const text = inputValue.trim();
        setInputValue("");
        setWarningMessage(null);
        setIsModerating(true);

        // Optimistic UI: Create temporary message
        const tempId = "temp-" + Date.now();
        const tempMessage: MessageDoc = {
            id: tempId,
            senderId: uid,
            receiverId: partnerId,
            content: text,
            createdAt: Timestamp.now(),
            moderationStatus: "pending",
            toxicityScore: 0,
            isDeleted: false,
            editedAt: null,
        };

        // Add to state immediately
        setMessages((prev) => [...prev, tempMessage]);

        try {
            // 1. Moderate the message through Gemini API
            const result = await moderateMessage(text);

            if (!result.safe) {
                // Remove temp message if unsafe
                setMessages((prev) => prev.filter((m) => m.id !== tempId));

                // 2a. UNSAFE — block message, increment violations, show warning
                await incrementViolationCount(uid);

                // 2b. Check if user should be auto-banned
                const nowBanned = await enforceBanThreshold(uid);
                if (nowBanned) {
                    await refreshBanStatus();
                    setIsModerating(false);
                    return;
                }

                // Show warning with remaining count
                await refreshBanStatus();
                const updatedWarning = getWarningMessage(result.category) +
                    "\n" + getRemainingWarnings(violationCount + 1);
                setWarningMessage(updatedWarning);
                setIsModerating(false);
                inputRef.current?.focus();
                return;
            }

            // 3. SAFE — store message normally
            // The real message will come back via subscription, so we can just let it sync
            // OR replace the temp ID with real ID if we want to be fancy, but simple sync is usually enough
            await sendMessage(chatId, uid, partnerId, text);
            // We rely on the subscription to update the ID/Status, but to avoid duplication flicker
            // we could remove the temp one once the real one arrives.
            // However, Firestore snapshot listeners are fast.
            // A common pattern is to keep the temp one until strict equality match from server.
            // For simplicity here, we'll remove our temp one right after send success,
            // assuming the listener will pick up the real one almost instantly.
            setMessages((prev) => prev.filter((m) => m.id !== tempId));

        } catch (error) {
            console.error("Failed to send message:", error);
            // Keep temp message but maybe mark as failed? For now just remove or alert.
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setWarningMessage("Failed to send message. Please try again.");
        }

        setIsModerating(false);
        inputRef.current?.focus();
    }, [uid, chatId, partnerId, inputValue, violationCount, refreshBanStatus]);

    // Track if we are locally ending the chat to prevent auto-requeue loop if we initiated it
    const isEndingRef = useRef(false);

    // Auto-Next Match Listener
    useEffect(() => {
        if (!chatId || chatState !== "matched") return;

        const db = getFirebaseDb();
        if (!db) return;

        const unsub = onSnapshot(doc(db, COLLECTIONS.CHATS, chatId), (snapshot) => {
            if (!snapshot.exists()) return;
            const data = snapshot.data();

            // If chat is ended and WE didn't end it -> Auto Requeue
            if (data.status === "ended" && !isEndingRef.current) {
                // Partner disconnected
                console.log("Partner disconnected, auto-requeuing...");

                // Cleanup current chat state
                setChatId(null);
                setPartnerId(null);
                setMessages([]);

                // Start searching again immediately
                startMatchmaking();
            }
        });

        return () => unsub();
    }, [chatId, chatState, startMatchmaking]);

    const handleEndChat = useCallback(async () => {
        isEndingRef.current = true; // Mark that we are ending it
        if (chatId) {
            await endChat(chatId).catch(console.error);
        }
        playSound("chat_ended");
        setChatState("ended");
        setChatId(null);
        setPartnerId(null);
        setQueueDocId(null);

        // Reset flag after a short delay so it doesn't block future auto-requeues if we match again
        setTimeout(() => {
            isEndingRef.current = false;
        }, 1000);
    }, [chatId, playSound]);

    const handleBlockUser = useCallback(async () => {
        if (!uid || !partnerId) return;
        const confirmed = window.confirm(
            "Block this user? They won\u2019t be able to match with you again."
        );
        if (!confirmed) return;

        try {
            await blockUser(uid, partnerId);
            setUserBlockedPartner(true);
            // End the chat after blocking
            if (chatId) {
                await endChat(chatId).catch(console.error);
            }
            playSound("chat_ended");
            setChatState("ended");
            setChatId(null);
            setPartnerId(null);
            setQueueDocId(null);
        } catch (error) {
            console.error("Failed to block user:", error);
        }
    }, [uid, partnerId, chatId, playSound]);

    const handleReportMessage = useCallback((messageId: string) => {
        setReportMessageId(messageId);
        setReportModalOpen(true);
    }, []);

    const handleReportUser = useCallback(() => {
        setReportMessageId(null);
        setReportModalOpen(true);
    }, []);

    const handleSendConnect = useCallback(async () => {
        if (!uid || !partnerId || !chatId) return;
        try {
            await sendConnectRequest(uid, partnerId, chatId);
            setConnectSent(true);
        } catch (error) {
            console.error("Failed to send connect request:", error);
        }
    }, [uid, partnerId, chatId]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // ─── Loading state ──────────────────────────────────────────────
    if (authLoading || banLoading) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl">
                    <div className="card flex min-h-[70vh] items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-400" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Connecting…</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }



    return (
        <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-black">
            {/* Sidebar (Desktop: Always visible, Mobile: Hidden unless toggled) */}
            <div className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-white transition-transform duration-200 dark:bg-surface-dark lg:static lg:translate-x-0 ${showConnectedChats ? "translate-x-0" : "-translate-x-full"} border-r border-gray-200 dark:border-gray-800`}>
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="font-bold text-gray-900 dark:text-white">Chats</h2>
                        <button onClick={() => setShowConnectedChats(false)} className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                            <span className="sr-only">Close</span>
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {uid && <ConnectedChatsList currentUserId={uid} onSelectChat={handleSelectChat} activeChatId={chatId} />}
                    </div>

                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                        <Button variant="secondary" fullWidth onClick={() => {
                            setChatId(null);
                            setPartnerId(null);
                            setChatState("idle");
                            setShowConnectedChats(false);
                        }}>
                            Start Random Match
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="relative flex flex-1 flex-col overflow-hidden w-full">
                {/* Mobile Toggle */}
                <div className="lg:hidden absolute top-4 left-4 z-30">
                    <button
                        onClick={() => setShowConnectedChats(true)}
                        className="p-2 bg-white rounded-full shadow-md dark:bg-surface-dark border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
                    >
                        <span className="sr-only">Menu</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                    </button>
                </div>

                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8 w-full h-full flex flex-col">
                    <div className="mx-auto max-w-3xl w-full flex-1 flex flex-col">
                        {!chatId && chatState === "idle" && (
                            <div className="mb-6 text-center lg:text-left pl-12 lg:pl-0">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                                    Anonymous Chat
                                </h1>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Match randomly or chat with friends.
                                </p>
                            </div>
                        )}

                        {/* ─── Banned Screen ──────────────────────────────────────── */}
                        {isBlocked && (
                            <div className="card flex min-h-[60vh] flex-col items-center justify-center text-center">
                                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 dark:bg-red-950/40">
                                    <svg className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                </div>
                                <h2 className="mb-2 text-2xl font-bold text-red-600 dark:text-red-400">
                                    Account Suspended
                                </h2>
                                <p className="mb-4 max-w-md text-sm text-gray-600 dark:text-gray-400">
                                    Your account has been suspended due to multiple content policy violations.
                                    You are no longer able to start or participate in chats.
                                </p>
                                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 dark:border-red-900/50 dark:bg-red-950/20">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                        Violations: {violationCount} / 5
                                    </p>
                                </div>
                                <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
                                    If you believe this is a mistake, please contact support.
                                </p>
                            </div>
                        )}

                        {/* ─── Idle State ──────────────────────────────────────────── */}
                        {!isBlocked && chatState === "idle" && (
                            <div className="card flex min-h-[60vh] flex-col items-center justify-center text-center">
                                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 dark:from-primary-500/10 dark:to-accent-500/10">
                                    <svg className="h-10 w-10 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                    </svg>
                                </div>
                                <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Ready to Chat?
                                </h2>
                                <p className="mb-8 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                                    Click below to get matched with a random anonymous user. You can send a &quot;Connect&quot; request to become friends!
                                </p>
                                <Button size="lg" onClick={handleStartChat} className="px-10">
                                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                    </svg>
                                    Start Chat
                                </Button>

                                {recentMatches.length > 0 && (
                                    <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                                        {recentMatches.length} recent match{recentMatches.length !== 1 ? "es" : ""} excluded from pairing
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ─── Searching State ─────────────────────────────────────── */}
                        {chatState === "searching" && (
                            <div className="card flex min-h-[60vh] flex-col items-center justify-center text-center">
                                {/* Animated pulse rings */}
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 animate-ping rounded-full bg-primary-400/20 [animation-duration:2s]" style={{ width: 80, height: 80, top: -8, left: -8 }} />
                                    <div className="absolute inset-0 animate-ping rounded-full bg-primary-400/10 [animation-duration:3s]" style={{ width: 96, height: 96, top: -16, left: -16 }} />
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-950">
                                        <svg className="h-8 w-8 animate-pulse text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                        </svg>
                                    </div>
                                </div>
                                <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Finding someone{searchDots}
                                </h2>
                                <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
                                    Looking for an available chat partner
                                </p>
                                <Button variant="ghost" onClick={handleCancelSearch}>
                                    Cancel
                                </Button>
                            </div>
                        )}

                        {/* ─── Matched / Active Chat ───────────────────────────────── */}
                        {chatState === "matched" && chatId && (
                            <div className="card flex min-h-[70vh] flex-col overflow-hidden p-0">
                                {/* Chat header */}
                                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <Avatar seed={partnerId || "anon"} size={40} className="border-2 border-white dark:border-gray-700 shadow-sm" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                You are chatting with
                                            </p>
                                            <p className="text-base font-bold text-gray-900 dark:text-white">
                                                {isConnected ? partnerName : "Anonymous User"}
                                            </p>
                                            <p className="text-xs text-green-500">
                                                ● Online
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Mute toggle */}
                                        <button
                                            onClick={toggleMute}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                            title={isMuted ? "Unmute" : "Mute"}
                                        >
                                            {isMuted ? (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                                </svg>
                                            ) : (
                                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Connect button */}
                                        {!isConnected && !connectSent && (
                                            <Button size="sm" variant="secondary" onClick={handleSendConnect}>
                                                <svg className="mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                                </svg>
                                                Connect
                                            </Button>
                                        )}
                                        {connectSent && (
                                            <span className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
                                                ✓ Request Sent
                                            </span>
                                        )}
                                        {isConnected && (
                                            <span className="rounded-lg bg-accent-100 px-3 py-1.5 text-xs font-medium text-accent-700 dark:bg-accent-950 dark:text-accent-400">
                                                ★ Friends
                                            </span>
                                        )}

                                        {/* Report user button */}
                                        <button
                                            onClick={handleReportUser}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-950/30 dark:hover:text-yellow-400"
                                            title="Report user"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                                            </svg>
                                        </button>

                                        {/* Block user button */}
                                        {!userBlockedPartner && (
                                            <button
                                                onClick={handleBlockUser}
                                                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                                title="Block user"
                                            >
                                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                            </button>
                                        )}

                                        {/* End chat */}
                                        <Button size="sm" variant="danger" onClick={handleEndChat}>
                                            End
                                        </Button>
                                    </div>
                                </div>

                                {/* Connect request banner (for incoming requests) */}
                                {uid && chatId && <ConnectRequestBanner userId={uid} chatId={chatId} />}

                                {/* Messages area */}
                                <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(70vh - 130px)" }}>
                                    {messages.length === 0 && (
                                        <div className="flex h-full items-center justify-center">
                                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                                Say hello! 👋
                                            </p>
                                        </div>
                                    )}
                                    {messages.map((msg) => (
                                        <ChatBubble
                                            key={msg.id}
                                            message={msg}
                                            isOwn={msg.senderId === uid}
                                            onReport={handleReportMessage}
                                            partnerLastRead={partnerLastRead}
                                        />
                                    ))}
                                    {/* Typing Indicator */}
                                    {isPeerTyping && (
                                        <div className="flex items-center gap-2 px-2 py-1">
                                            <div className="flex items-center gap-1 rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
                                                <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                                                <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                                                <span className="block h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
                                            </div>
                                            <span className="text-xs text-gray-400">Partner is typing...</span>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Moderation warning banner */}
                                {warningMessage && (
                                    <div className="flex items-start gap-2 border-t border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/50 dark:bg-red-950/30">
                                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                        </svg>
                                        <p className="flex-1 text-sm text-red-700 dark:text-red-400">{warningMessage}</p>
                                        <button
                                            onClick={() => setWarningMessage(null)}
                                            className="shrink-0 text-red-400 transition-colors hover:text-red-600 dark:hover:text-red-300"
                                        >
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                {/* Input area */}
                                <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-3 dark:border-gray-700 dark:bg-surface-darker/50">
                                    {/* Moderating indicator */}
                                    {isModerating && (
                                        <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-primary-500" />
                                            Checking message…
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={inputValue}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Type a message…"
                                            disabled={isModerating}
                                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 disabled:opacity-50 dark:border-gray-700 dark:bg-surface-dark dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-primary-500"
                                            autoFocus
                                        />
                                        <Button
                                            onClick={handleSendMessage}
                                            disabled={!inputValue.trim() || isModerating}
                                            isLoading={isModerating}
                                            className="shrink-0"
                                        >
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                            </svg>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── Ended State ─────────────────────────────────────────── */}
                        {chatState === "ended" && (
                            <div className="card flex min-h-[60vh] flex-col items-center justify-center text-center">
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
                                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                                    </svg>
                                </div>
                                <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                                    Chat Ended
                                </h2>
                                <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
                                    The conversation has ended. Start a new one?
                                </p>
                                <Button size="lg" onClick={handleStartChat} className="px-10">
                                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                    </svg>
                                    New Chat
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Report Modal */}
                    {uid && partnerId && chatId && (
                        <ReportModal
                            isOpen={reportModalOpen}
                            onClose={() => setReportModalOpen(false)}
                            reporterId={uid}
                            reportedUserId={partnerId}
                            chatId={chatId}
                            messageId={reportMessageId}
                        />
                    )}

                    {/* Onboarding Modal */}
                    {uid && (
                        <OnboardingModal
                            isOpen={onboardingOpen}
                            onClose={() => setOnboardingOpen(false)}
                            userId={uid}
                            onComplete={handleOnboardingComplete}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
