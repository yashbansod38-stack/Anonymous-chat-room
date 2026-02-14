"use client";

import { useAuth } from "@/context/AuthContext";
import { usePresence } from "@/hooks/usePresence";

export default function PresenceManager() {
    const { uid } = useAuth();
    usePresence(uid);
    return null; // This component handles side effects only
}
