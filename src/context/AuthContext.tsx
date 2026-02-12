"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    type ReactNode,
} from "react";
import {
    onAuthStateChanged,
    signInAnonymously,
    type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { getUserProfile, updateLastActive } from "@/lib/userProfile";

interface AuthContextType {
    /** The current Firebase user, or null if not yet authenticated */
    user: User | null;
    /** Shorthand for user.uid — null while loading */
    uid: string | null;
    /** True while the initial auth state is being resolved */
    loading: boolean;
    /** True once the user is authenticated */
    isAuthenticated: boolean;
    /** True if the user signed in anonymously */
    isAnonymous: boolean;
    /** The user's chosen display name, or null if not yet onboarded */
    displayName: string | null;
    /** True if the user has completed onboarding (has a profile) */
    hasProfile: boolean;
    /** Update the display name after onboarding completes */
    setDisplayName: (name: string) => void;
    /** Re-check profile from Firestore */
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    uid: null,
    loading: true,
    isAuthenticated: false,
    isAnonymous: false,
    displayName: null,
    hasProfile: false,
    setDisplayName: () => { },
    refreshProfile: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [hasProfile, setHasProfile] = useState(false);

    // Check if user has a profile in Firestore
    const refreshProfile = useCallback(async () => {
        if (!user?.uid) return;
        try {
            const profile = await getUserProfile(user.uid);
            if (profile) {
                setDisplayName(profile.displayName);
                setHasProfile(true);
                // Update last active timestamp
                updateLastActive(user.uid).catch(() => { });
            } else {
                setDisplayName(null);
                setHasProfile(false);
            }
        } catch (error) {
            console.error("[AuthProvider] Profile check failed:", error);
            setDisplayName(null);
            setHasProfile(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        const auth = getFirebaseAuth();

        // If Firebase isn't available (missing config), stop loading
        if (!auth) {
            console.warn("[AuthProvider] Firebase Auth not available.");
            setLoading(false);
            return;
        }

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Check if user has a profile
                try {
                    const profile = await getUserProfile(firebaseUser.uid);
                    if (profile) {
                        setDisplayName(profile.displayName);
                        setHasProfile(true);
                        updateLastActive(firebaseUser.uid).catch(() => { });
                    }
                } catch {
                    // Profile doesn't exist yet — that's fine
                }
                setLoading(false);
            } else {
                // No user — sign in anonymously
                try {
                    await signInAnonymously(auth);
                    // onAuthStateChanged will fire again with the new user
                } catch (error) {
                    console.error("Anonymous sign-in failed:", error);
                    setLoading(false);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const handleSetDisplayName = useCallback((name: string) => {
        setDisplayName(name);
        setHasProfile(true);
    }, []);

    const value: AuthContextType = {
        user,
        uid: user?.uid ?? null,
        loading,
        isAuthenticated: !!user,
        isAnonymous: user?.isAnonymous ?? false,
        displayName,
        hasProfile,
        setDisplayName: handleSetDisplayName,
        refreshProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state anywhere in the app.
 *
 * @example
 * const { uid, loading, isAuthenticated, displayName, hasProfile } = useAuth();
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
