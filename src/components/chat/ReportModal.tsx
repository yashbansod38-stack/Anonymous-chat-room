"use client";

import { useState } from "react";
import { fileReport, REPORT_REASON_LABELS } from "@/lib/report";
import type { ReportReason } from "@/types";
import Button from "@/components/ui/Button";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reporterId: string;
    reportedUserId: string;
    chatId: string;
    messageId?: string | null;
}

const REASONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][];

export default function ReportModal({
    isOpen,
    onClose,
    reporterId,
    reportedUserId,
    chatId,
    messageId,
}: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setSubmitting(true);

        try {
            await fileReport({
                reporterId,
                reportedUserId,
                chatId,
                messageId: messageId || null,
                reason: selectedReason,
                description,
            });
            setSubmitted(true);
        } catch (error) {
            console.error("Failed to submit report:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedReason(null);
        setDescription("");
        setSubmitted(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md animate-fade-in rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-surface-dark">
                {submitted ? (
                    /* Success state */
                    <div className="text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                            <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                            Report Submitted
                        </h3>
                        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                            Thank you. We&apos;ll review this report and take appropriate action.
                        </p>
                        <Button onClick={handleClose}>Close</Button>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {messageId ? "Report Message" : "Report User"}
                            </h3>
                            <button
                                onClick={handleClose}
                                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Reason picker */}
                        <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select a reason:
                        </p>
                        <div className="mb-4 space-y-2">
                            {REASONS.map(([value, label]) => (
                                <button
                                    key={value}
                                    onClick={() => setSelectedReason(value)}
                                    className={`w-full rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${selectedReason === value
                                            ? "border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-950/30 dark:text-primary-300"
                                            : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Description */}
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details (optional)…"
                            rows={3}
                            className="mb-5 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-primary-400 dark:border-gray-700 dark:bg-surface-darker dark:text-gray-200 dark:placeholder-gray-500"
                        />

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={handleClose} className="flex-1">
                                Cancel
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleSubmit}
                                disabled={!selectedReason}
                                isLoading={submitting}
                                className="flex-1"
                            >
                                Submit Report
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
