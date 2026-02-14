"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ui/ThemeToggle";
import Avatar from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { APP_NAME } from "@/config/constants";

export default function Header() {
    const { uid, loading, isAuthenticated, displayName, user } = useAuth();
    console.log("[Header Debug] Render:", { uid, displayName, user });

    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-gray-800/60 dark:bg-surface-darker/80">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2 transition-opacity hover:opacity-80"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 shadow-md shadow-primary-500/25">
                        <svg
                            className="h-5 w-5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                        {APP_NAME}
                    </span>
                </Link>

                {/* Navigation */}
                <nav className="hidden items-center gap-1 sm:flex">
                    <Link
                        href="/"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                        Home
                    </Link>
                    <Link
                        href="/chat"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                        Chat
                    </Link>
                    <Link
                        href="/about"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                    >
                        About
                    </Link>

                </nav>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    {/* Auth status indicator / User Profile */}
                    {loading ? (
                        <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
                    ) : isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => document.dispatchEvent(new CustomEvent("open-profile-settings"))}
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                            >
                                Edit Profile
                            </button>
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {displayName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {user?.uid.slice(0, 6)}...
                                </p>
                            </div>
                            <Avatar seed={user?.uid || "user"} size={40} />
                        </div>
                    ) : (
                        <div className="h-2 w-2 rounded-full bg-red-400" />
                    )}

                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
