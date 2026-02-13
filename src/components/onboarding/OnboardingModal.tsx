
"use client";

import { useState } from "react";
import { validateUsername, isUsernameTaken, createUserProfile } from "@/lib/userProfile";
import Button from "@/components/ui/Button";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onComplete: (displayName: string) => void;
}

export default function OnboardingModal({ isOpen, onClose, userId, onComplete }: OnboardingModalProps) {
    const [username, setUsername] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        setError(null);

        // Validate format
        const validationError = validateUsername(username);
        if (validationError) {
            setError(validationError);
            return;
        }

        setChecking(true);
        try {
            // Check uniqueness
            const taken = await isUsernameTaken(username.trim());
            if (taken) {
                setError("This username is already taken. Try another one!");
                setChecking(false);
                return;
            }

            // Create profile
            await createUserProfile(userId, username.trim());
            onComplete(username.trim());
        } catch (err) {
            console.error("Onboarding failed:", err);
            setError("Something went wrong. Please try again.");
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-200">
                <div className="rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-dark">
                    {/* Header */}
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Pick a Username
                        </h2>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Choose a unique name to start chatting.
                        </p>
                    </div>

                    {/* Input */}
                    <div className="mb-6">
                        <label
                            htmlFor="username-modal"
                            className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
                        >
                            Username
                        </label>
                        <input
                            id="username-modal"
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                            placeholder="e.g. shadow_ninja"
                            maxLength={16}
                            autoFocus
                            className="mb-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 dark:border-gray-700 dark:bg-surface-darker dark:text-gray-200 dark:placeholder-gray-500"
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Letters, numbers, underscores only
                            </p>
                            <span
                                className={`text-xs font-mono ${username.length > 16 || username.length < 3
                                    ? "text-red-400"
                                    : "text-gray-400"
                                    }`}
                            >
                                {username.length}/16
                            </span>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={handleSubmit}
                            disabled={!username.trim() || checking}
                            isLoading={checking}
                            className="w-full"
                            size="lg"
                        >
                            {checking ? "Checking..." : "Continue"}
                        </Button>
                        <button
                            onClick={onClose}
                            className="mt-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            Cancel
                        </button>
                    </div>

                    <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">
                        Your identity stays anonymous.
                    </p>
                </div>
            </div>
        </div>
    );
}
