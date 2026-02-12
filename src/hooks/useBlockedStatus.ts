"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { checkBanStatus, type BanStatus } from "@/lib/ban";

/**
 * Hook to check and monitor the current user's blocked status.
 * Re-checks on demand via `refresh()`.
 */
export function useBlockedStatus() {
    const { uid, loading: authLoading } = useAuth();
    const [status, setStatus] = useState<BanStatus>({
        isBlocked: false,
        violationCount: 0,
    });
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!uid) {
            // If no uid yet (auth still loading), don't block — set loading false
            setLoading(false);
            return;
        }
        try {
            const result = await checkBanStatus(uid);
            setStatus(result);
        } catch (error) {
            console.error("[useBlockedStatus] Check failed:", error);
        } finally {
            setLoading(false);
        }
    }, [uid]);

    useEffect(() => {
        // If auth is still loading, keep our loading true but don't block forever
        if (authLoading) return;
        refresh();
    }, [refresh, authLoading]);

    return { ...status, loading, refresh };
}
