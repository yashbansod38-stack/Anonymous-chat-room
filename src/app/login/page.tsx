"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { isUsernameTaken, validateUsername } from "@/lib/userProfile";

type AuthMode = "signin" | "signup";

export default function LoginPage() {
    const { login, register, loading, user } = useAuth();
    const router = useRouter();

    const [mode, setMode] = useState<AuthMode>("signin");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If already logged in, redirect to chat
    useEffect(() => {
        if (!loading && user) {
            router.replace("/chat");
        }
    }, [loading, user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (mode === "signup") {
                // 1. Validate format
                const validationError = validateUsername(username);
                if (validationError) throw new Error(validationError);

                if (password.length < 6) throw new Error("Password must be at least 6 characters");

                // 2. Check uniqueness
                const taken = await isUsernameTaken(username);
                if (taken) throw new Error("Username is already taken");

                // 3. Register
                await register(username, password);
            } else {
                // Sign In
                await login(username, password);
            }
            // Router redirect handled by usage in AuthContext or useEffect, 
            // but we can force it here too just in case.
            router.push("/chat");
        } catch (err: unknown) {
            console.error("Auth error:", err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            let msg = "Authentication failed.";

            if (error.message) {
                msg = error.message;
            } else if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                msg = "Invalid username or password.";
            } else if (error.code === "auth/email-already-in-use") {
                msg = "Username already taken.";
            } else if (error.code === "auth/weak-password") {
                msg = "Password should be at least 6 characters.";
            }

            // Clean up firebase error prefixes if explicit message wasn't caught
            if (msg.includes("Firebase:")) msg = "Service error. Please try again.";

            setError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-950">
            <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-900">
                <div className="text-center">
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {mode === "signin" ? "Welcome Back" : "Create Account"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {mode === "signin"
                            ? "Enter your credentials to continue"
                            : "Choose a username and password to get started"}
                    </p>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
                    <button
                        onClick={() => { setMode("signin"); setError(null); }}
                        className={`rounded-md py-2 text-sm font-medium transition-all ${mode === "signin"
                                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                            }`}
                    >
                        Sign In
                    </button>
                    <button
                        onClick={() => { setMode("signup"); setError(null); }}
                        className={`rounded-md py-2 text-sm font-medium transition-all ${mode === "signup"
                                ? "bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white"
                                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                            }`}
                    >
                        Sign Up
                    </button>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                                Username
                            </label>
                            <div className="mt-2">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6"
                                    placeholder="cool_user_123"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">
                                Password
                            </label>
                            <div className="mt-2">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6"
                                    placeholder="••••••"
                                />
                            </div>
                            {mode === "signup" && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Must be at least 6 characters.
                                </p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? "Processing..." : (mode === "signin" ? "Sign In" : "Create Account")}
                        </button>
                    </div>
                </form>

                <div className="text-center">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-2 text-sm text-gray-500 dark:bg-gray-900">Or continue as guest</span>
                        </div>
                    </div>

                    <Link
                        href="/chat"
                        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                    >
                        Skip Login &rarr;
                    </Link>
                </div>
            </div>
        </div>
    );
}
