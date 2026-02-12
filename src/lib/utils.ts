// Utility helper functions

import { type ClassValue, clsx } from "clsx";

/**
 * Merge class names conditionally.
 * Install clsx: npm install clsx
 *
 * Usage: cn("base-class", condition && "conditional-class")
 */
export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

/**
 * Generate a random anonymous display name.
 */
export function generateAnonName(): string {
    const adjectives = [
        "Swift",
        "Silent",
        "Brave",
        "Curious",
        "Witty",
        "Bold",
        "Calm",
        "Keen",
        "Wise",
        "Vivid",
    ];
    const nouns = [
        "Fox",
        "Owl",
        "Wolf",
        "Hawk",
        "Bear",
        "Lynx",
        "Crow",
        "Deer",
        "Hare",
        "Dove",
    ];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj}${noun}${num}`;
}

/**
 * Format a timestamp into a human-readable relative time string.
 */
export function formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
