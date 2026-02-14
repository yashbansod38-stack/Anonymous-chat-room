"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function LoginPage() {
    const { login, upgradeAccount, displayName, loading } = useAuth();
    const router = useRouter();

    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-fill username if upgrading
    useEffect(() => {
        if (displayName) setUsername(displayName);
    }, [displayName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            if (isRegistering) {
                // Ensure they are upgrading THEIR username
                if (displayName && username.toLowerCase() !== displayName.toLowerCase()) {
                    throw new Error(`You are currently logged in as "${displayName}". Please use that username or logout first.`);
                }
                await upgradeAccount(username, password);
            } else {
                await login(username, password);
            }
            router.push("/chat");
        } catch (err: unknown) {
            console.error("Auth error:", err);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const error = err as any;
            let msg = "Authentication failed.";
            if (error.message && error.message.includes("is currently logged in as")) {
                msg = error.message;
            } else if (error.code === "auth/email-already-in-use" || error.code === "auth/credential-already-in-use") {
                msg = "Username already taken. Please login.";
            } else if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
                msg = "Invalid username or password.";
            } else if (error.code === "auth/weak-password") {
                msg = "Password should be at least 6 characters.";
            }
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
                        {isRegistering ? "Secure your Account" : "Welcome Back"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {isRegistering
                            ? "Set a password for your username to access your chats on other devices."
                            : "Enter your username and password to continue."}
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div>
                            <label htmlFor="username" className="sr-only">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="relative block w-full rounded-t-md border-0 py-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6"
                                placeholder="Username"
                                // Lock username if registering and already has one
                                readOnly={isRegistering && !!displayName}
                                style={isRegistering && !!displayName ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="relative block w-full rounded-b-md border-0 py-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-indigo-600 dark:bg-gray-800 dark:text-white dark:ring-gray-700 sm:text-sm sm:leading-6"
                                placeholder="Password"
                            />
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
                            className="group relative flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-70"
                        >
                            {isSubmitting ? "Processing..." : (isRegistering ? "Create Account" : "Sign in")}
                        </button>
                    </div>
                </form>

                <div className="flex flex-col gap-4 text-center text-sm">
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError(null);
                        }}
                        className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
                    >
                        {isRegistering
                            ? "Already have an account? Sign in"
                            : "Don't have an account? Create one"}
                    </button>

                    <Link href="/chat" className="text-gray-500 hover:text-gray-900 dark:hover:text-gray-300">
                        Continue as Guest &rarr;
                    </Link>
                </div>
            </div>
        </div>
    );
}
