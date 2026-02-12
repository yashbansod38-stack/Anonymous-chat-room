"use client";

import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle() {
    const { resolvedTheme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg
                 border border-gray-200 bg-white text-gray-700
                 transition-all duration-300 hover:bg-gray-100 hover:scale-105
                 dark:border-gray-700 dark:bg-surface-dark dark:text-gray-300
                 dark:hover:bg-gray-700 focus:outline-none focus:ring-2
                 focus:ring-primary-500/50"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
            {/* Sun icon */}
            <svg
                className={`h-5 w-5 transition-all duration-300 ${resolvedTheme === "dark"
                        ? "rotate-0 scale-100 opacity-100"
                        : "rotate-90 scale-0 opacity-0 absolute"
                    }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
            </svg>
            {/* Moon icon */}
            <svg
                className={`h-5 w-5 transition-all duration-300 ${resolvedTheme === "light"
                        ? "rotate-0 scale-100 opacity-100"
                        : "-rotate-90 scale-0 opacity-0 absolute"
                    }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
            </svg>
        </button>
    );
}
