import { useState, useEffect } from "react";
import type { MessageDoc } from "@/types";
import { Timestamp } from "firebase/firestore";
import Avatar from "@/components/ui/Avatar";

interface ChatBubbleProps {
    message: MessageDoc;
    isOwn: boolean;
    partnerLastRead?: Timestamp | null;
    onReport?: (messageId: string) => void;
}

export default function ChatBubble({ message, isOwn, partnerLastRead, onReport }: ChatBubbleProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [decryptedText, setDecryptedText] = useState<string | null>(null);
    const [isDecrypting, setIsDecrypting] = useState(false);

    const isSystem = message.senderId === "system";
    const date = message.createdAt instanceof Timestamp ? message.createdAt.toDate() : new Date();

    // Decryption Effect
    useEffect(() => {
        if (message.type === "encrypted" && message.iv && !decryptedText) {
            setIsDecrypting(true);
            const otherId = isOwn ? message.receiverId : message.senderId;

            import("@/lib/e2ee").then(async ({ getSharedKey, decryptMessage }) => {
                try {
                    const key = await getSharedKey(otherId);
                    if (key) {
                        const text = await decryptMessage(message.iv!, message.content, key);
                        setDecryptedText(text);
                    } else {
                        setDecryptedText("[Missing Key - Cannot Decrypt]");
                    }
                } catch (e) {
                    console.error("Decryption failed:", e);
                    setDecryptedText("[Decryption Failed]");
                } finally {
                    setIsDecrypting(false);
                }
            });
        }
    }, [message, isOwn, decryptedText]);

    const isRead = isOwn && partnerLastRead && message.createdAt && (
        partnerLastRead.toMillis() >= message.createdAt.toMillis()
    );

    const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const handleContextMenu = (e: React.MouseEvent) => {
        if (isOwn) return; // can't report own messages
        e.preventDefault();
        setShowMenu((prev) => !prev);
    };

    // Display Content Logic
    let displayContent = message.content;
    if (message.type === "encrypted") {
        if (isDecrypting) displayContent = "🔐 Decrypting...";
        else if (decryptedText) displayContent = decryptedText;
        else displayContent = "🔒 Encrypted Message";
    }

    return (
        <div className={`flex w-full ${isOwn ? "justify-end" : "justify-start"} mb-4`}>
            {!isOwn && !isSystem && (
                <Avatar seed={message.senderId} size={32} className="mr-2 self-end mb-1" />
            )}
            <div
                className={`group relative max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm md:max-w-[70%] ${isOwn
                    ? "bg-primary-600 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 rounded-tl-sm"
                    }`}
                onContextMenu={handleContextMenu}
            >
                <div className="whitespace-pre-wrap break-words">{displayContent}</div>
                <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${isOwn ? "text-primary-100" : "text-gray-400"}`}>
                    <span>{time}</span>
                    {isOwn && (
                        <span>
                            {isRead ? (
                                <span className="font-bold text-blue-200" title="Seen">✓✓</span>
                            ) : (
                                <span className="opacity-70" title="Sent">✓</span>
                            )}
                        </span>
                    )}
                </div>

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
