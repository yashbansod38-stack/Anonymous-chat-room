"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    fetchPlatformStats,
    fetchReports,
    fetchBannedUsers,
    manualBanUser,
    unbanUser,
    updateReportStatus,
    lookupUser,
    type PlatformStats,
    type ReportWithId,
    type BannedUserInfo,
} from "@/lib/admin";
import type { UserDoc } from "@/types";
import Button from "@/components/ui/Button";

// ─── Stats Card ────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
}) {
    return (
        <div className="card flex items-center gap-4 p-5">
            <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${color}`}
            >
                {icon}
            </div>
            <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {value}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
        </div>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function AdminPage() {
    const { uid, loading: authLoading } = useAuth();

    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [reports, setReports] = useState<ReportWithId[]>([]);
    const [bannedUsers, setBannedUsers] = useState<BannedUserInfo[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState<"reports" | "banned" | "lookup">(
        "reports"
    );

    // Ban user by ID
    const [banInput, setBanInput] = useState("");
    const [banLoading, setBanLoading] = useState(false);
    const [banMessage, setBanMessage] = useState<string | null>(null);

    // User lookup
    const [lookupInput, setLookupInput] = useState("");
    const [lookupResult, setLookupResult] = useState<UserDoc | null>(null);
    const [lookupNotFound, setLookupNotFound] = useState(false);

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [s, r, b] = await Promise.all([
                fetchPlatformStats(),
                fetchReports(),
                fetchBannedUsers(),
            ]);
            setStats(s);
            setReports(r);
            setBannedUsers(b);
        } catch (error) {
            console.error("[Admin] Failed to load data:", error);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (!authLoading && uid) loadData();
    }, [authLoading, uid, loadData]);

    const handleManualBan = async () => {
        if (!banInput.trim()) return;
        setBanLoading(true);
        setBanMessage(null);
        try {
            await manualBanUser(banInput.trim());
            setBanMessage(`User ${banInput.trim().slice(0, 12)}… has been banned.`);
            setBanInput("");
            await loadData();
        } catch (error) {
            setBanMessage("Failed to ban user. Check the ID and try again.");
            console.error(error);
        } finally {
            setBanLoading(false);
        }
    };

    const handleUnban = async (userId: string) => {
        const confirmed = window.confirm(
            `Unban user ${userId.slice(0, 12)}…? This will reset their violation count.`
        );
        if (!confirmed) return;
        try {
            await unbanUser(userId);
            await loadData();
        } catch (error) {
            console.error("Failed to unban:", error);
        }
    };

    const handleResolveReport = async (
        reportId: string,
        status: "resolved" | "dismissed"
    ) => {
        try {
            await updateReportStatus(reportId, status);
            await loadData();
        } catch (error) {
            console.error("Failed to update report:", error);
        }
    };

    const handleLookup = async () => {
        if (!lookupInput.trim()) return;
        setLookupResult(null);
        setLookupNotFound(false);
        try {
            const user = await lookupUser(lookupInput.trim());
            if (user) {
                setLookupResult(user);
            } else {
                setLookupNotFound(true);
            }
        } catch (error) {
            console.error("Lookup failed:", error);
            setLookupNotFound(true);
        }
    };

    // ─── Loading ───────────────────────────────────────────────────

    if (authLoading || loadingData) {
        return (
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600 dark:border-gray-700 dark:border-t-primary-400" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Loading dashboard…
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────────────

    const TABS = [
        { key: "reports" as const, label: "Reports", count: stats?.pendingReports },
        { key: "banned" as const, label: "Banned Users", count: stats?.bannedUsers },
        { key: "lookup" as const, label: "User Lookup" },
    ];

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                    Admin Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Platform overview and moderation tools
                </p>
            </div>

            {/* Stats Grid */}
            {stats && (
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <StatCard
                        label="Total Users"
                        value={stats.totalUsers}
                        color="bg-primary-100 dark:bg-primary-950"
                        icon={
                            <svg className="h-6 w-6 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Total Chats"
                        value={stats.totalChats}
                        color="bg-accent-100 dark:bg-accent-950"
                        icon={
                            <svg className="h-6 w-6 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Total Reports"
                        value={stats.totalReports}
                        color="bg-yellow-100 dark:bg-yellow-950"
                        icon={
                            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Pending Reports"
                        value={stats.pendingReports}
                        color="bg-orange-100 dark:bg-orange-950"
                        icon={
                            <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Banned Users"
                        value={stats.bannedUsers}
                        color="bg-red-100 dark:bg-red-950"
                        icon={
                            <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Connections"
                        value={stats.activeConnections}
                        color="bg-green-100 dark:bg-green-950"
                        icon={
                            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-1.135a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364l1.757 1.757" />
                            </svg>
                        }
                    />
                </div>
            )}

            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-surface-darker">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab.key
                                ? "bg-white text-gray-900 shadow-sm dark:bg-surface-dark dark:text-white"
                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                            }`}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-400">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ─── Reports Tab ──────────────────────────────────────────── */}
            {activeTab === "reports" && (
                <div className="card overflow-hidden p-0">
                    <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            User Reports
                        </h2>
                    </div>
                    {reports.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                No reports filed yet.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-surface-darker">
                                    <tr>
                                        <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Reporter</th>
                                        <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Reported</th>
                                        <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Reason</th>
                                        <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                                        <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                                            <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                {report.reporterId?.slice(0, 10)}…
                                            </td>
                                            <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">
                                                {report.reportedUserId?.slice(0, 10)}…
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="inline-flex rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                                                    {report.reason?.replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${report.status === "pending"
                                                            ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                                                            : report.status === "resolved"
                                                                ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                                                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                                        }`}
                                                >
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                {report.status === "pending" && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleResolveReport(report.id, "resolved")}
                                                            className="rounded-lg bg-green-100 px-3 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
                                                        >
                                                            Resolve
                                                        </button>
                                                        <button
                                                            onClick={() => handleResolveReport(report.id, "dismissed")}
                                                            className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                                                        >
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ─── Banned Users Tab ─────────────────────────────────────── */}
            {activeTab === "banned" && (
                <div className="space-y-6">
                    {/* Manual ban input */}
                    <div className="card p-5">
                        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                            Manually Ban User
                        </h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={banInput}
                                onChange={(e) => setBanInput(e.target.value)}
                                placeholder="Enter user ID…"
                                className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 dark:border-gray-700 dark:bg-surface-dark dark:text-gray-200"
                            />
                            <Button
                                variant="danger"
                                onClick={handleManualBan}
                                disabled={!banInput.trim()}
                                isLoading={banLoading}
                            >
                                Ban User
                            </Button>
                        </div>
                        {banMessage && (
                            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                {banMessage}
                            </p>
                        )}
                    </div>

                    {/* Banned users list */}
                    <div className="card overflow-hidden p-0">
                        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Banned Users ({bannedUsers.length})
                            </h2>
                        </div>
                        {bannedUsers.length === 0 ? (
                            <div className="flex items-center justify-center py-16">
                                <p className="text-sm text-gray-400 dark:text-gray-500">
                                    No banned users.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                {bannedUsers.map((user) => (
                                    <div
                                        key={user.userId}
                                        className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                                                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {user.displayName}
                                                </p>
                                                <p className="font-mono text-xs text-gray-400">
                                                    {user.userId.slice(0, 16)}…
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {user.violationCount} violations
                                            </span>
                                            <button
                                                onClick={() => handleUnban(user.userId)}
                                                className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-950 dark:text-green-400 dark:hover:bg-green-900"
                                            >
                                                Unban
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── User Lookup Tab ──────────────────────────────────────── */}
            {activeTab === "lookup" && (
                <div className="card p-5">
                    <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                        Look Up User
                    </h3>
                    <div className="mb-5 flex gap-3">
                        <input
                            type="text"
                            value={lookupInput}
                            onChange={(e) => setLookupInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                            placeholder="Enter user ID…"
                            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-mono text-gray-800 placeholder-gray-400 outline-none transition-all focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 dark:border-gray-700 dark:bg-surface-dark dark:text-gray-200"
                        />
                        <Button onClick={handleLookup} disabled={!lookupInput.trim()}>
                            Search
                        </Button>
                    </div>

                    {lookupNotFound && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            User not found.
                        </p>
                    )}

                    {lookupResult && (
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700">
                                {[
                                    ["User ID", lookupResult.userId],
                                    ["Display Name", lookupResult.displayName || "—"],
                                    ["Violations", lookupResult.violationCount],
                                    ["Blocked", lookupResult.isBlocked ? "Yes ⛔" : "No"],
                                    ["Anonymous", lookupResult.isAnonymous ? "Yes" : "No"],
                                    [
                                        "Blocked Users",
                                        lookupResult.blockedUsers?.length
                                            ? lookupResult.blockedUsers.length.toString()
                                            : "0",
                                    ],
                                ].map(([label, value]) => (
                                    <div
                                        key={label as string}
                                        className="bg-white px-4 py-3 dark:bg-surface-dark"
                                    >
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {label}
                                        </p>
                                        <p className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                                            {value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-surface-darker">
                                {lookupResult.isBlocked ? (
                                    <button
                                        onClick={() => {
                                            handleUnban(lookupResult.userId);
                                            setLookupResult({ ...lookupResult, isBlocked: false, violationCount: 0 });
                                        }}
                                        className="rounded-lg bg-green-100 px-4 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 dark:bg-green-950 dark:text-green-400"
                                    >
                                        Unban User
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            await manualBanUser(lookupResult.userId);
                                            setLookupResult({ ...lookupResult, isBlocked: true });
                                            await loadData();
                                        }}
                                        className="rounded-lg bg-red-100 px-4 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-200 dark:bg-red-950 dark:text-red-400"
                                    >
                                        Ban User
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Refresh */}
            <div className="mt-6 text-center">
                <Button variant="ghost" onClick={loadData}>
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                    Refresh Data
                </Button>
            </div>
        </div>
    );
}
