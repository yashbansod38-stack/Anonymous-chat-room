"use client";

import { useState } from "react";
import { validateUsername, isUsernameTaken, createUserProfile } from "@/lib/userProfile";
import Button from "@/components/ui/Button";

interface OnboardingScreenProps {
    userId: string;
    onComplete: (displayName: string) => void;
}

export default function OnboardingScreen({ userId, onComplete }: OnboardingScreenProps) {
    const [username, setUsername] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

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
        <div className="flex min-h-[80vh] items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo & Welcome */}
                <div className="mb-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
                        <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                        Welcome to SafeChat
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Pick a username to get started. This is how others will see you.
                    </p>
                </div>

                {/* Username Input */}
                <div className="card p-6">
                    <label
                        htmlFor="username"
                        className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-300"
                    >
                        Choose your username
                    </label>
                    <input
                        id="username"
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
                        className="mb-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 dark:border-gray-700 dark:bg-surface-dark dark:text-gray-200 dark:placeholder-gray-500"
                    />

                    {/* Character count & validation hints */}
                    <div className="mb-4 flex items-center justify-between">
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

                    {/* Error message */}
                    {error && (
                        <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    <Button
                        onClick={handleSubmit}
                        disabled={!username.trim() || checking}
                        isLoading={checking}
                        className="w-full"
                        size="lg"
                    >
                        {checking ? "Checking..." : "Let's go!"}
                    </Button>
                </div>

                {/* Privacy note */}
                <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">
                    Your identity stays anonymous. Only your username is visible in chats.
                </p>
            </div>
        </div>
    );
}
