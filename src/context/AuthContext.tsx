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
    signInWithEmailAndPassword,
    signOut,
    linkWithCredential,
    EmailAuthProvider,
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
    /** Login with Username/Password */
    login: (u: string, p: string) => Promise<void>;
    /** Register new account with Username/Password */
    register: (u: string, p: string) => Promise<void>;
    /** Upgrade anonymous account to Username/Password */
    upgradeAccount: (u: string, p: string) => Promise<void>;
    /** Logout (will auto-sign in anonymously after) */
    logout: () => Promise<void>;
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
    login: async () => { },
    register: async () => { },
    upgradeAccount: async () => { },
    logout: async () => { },
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
            console.log("[AuthContext] Auth State Changed:", firebaseUser?.uid);

            if (firebaseUser) {
                // Initialize E2EE Keys
                import("@/lib/e2ee").then(({ initializeE2EE }) => {
                    initializeE2EE(firebaseUser.uid).catch(e => console.error("E2EE Init Error:", e));
                });

                setUser(firebaseUser);
                // Check if user has a profile
                try {
                    const profile = await getUserProfile(firebaseUser.uid);
                    if (profile) {
                        setDisplayName(profile.displayName);
                        setHasProfile(true);
                        updateLastActive(firebaseUser.uid).catch(() => { });
                    } else {
                        setDisplayName(null);
                        setHasProfile(false);
                    }
                } catch (e) {
                    console.error("[AuthContext] Failed to fetch profile:", e);
                } finally {
                    setLoading(false);
                }
            } else {
                // No user — sign in anonymously
                console.log("[AuthContext] Signing in anonymously...");
                try {
                    await signInAnonymously(auth);
                    // onAuthStateChanged will fire again with the new user
                    // We DO NOT set loading(false) here, we wait for the next event
                } catch (error) {
                    console.error("[AuthContext] Anonymous sign-in failed:", error);
                    setLoading(false); // Stop loading on error
                }
            }
        });

        return () => unsubscribe();
    }, []);

    const handleSetDisplayName = useCallback((name: string) => {
        setDisplayName(name);
        setHasProfile(true);
    }, []);

    const login = useCallback(async (username: string, pass: string) => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase not initialized");
        const email = `${username.toLowerCase()}@safe-anon-chat.com`;
        await signInWithEmailAndPassword(auth, email, pass);
    }, []);

    const register = useCallback(async (username: string, pass: string) => {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Firebase not initialized");

        // 1. Check if username is taken (handled by UI usually, but good to be safe)
        // We rely on the UI to call isUsernameTaken first, or catch the email-already-in-use error.

        const email = `${username.toLowerCase()}@safe-anon-chat.com`;

        // 2. Create Auth User
        const { createUserWithEmailAndPassword } = await import("firebase/auth");
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // 3. Create Profile
        const { createUserProfile } = await import("@/lib/userProfile");
        await createUserProfile(user.uid, username, false); // isAnonymous = false

        // 4. Set local display name immediately
        setDisplayName(username);
        setHasProfile(true);
    }, []);

    const upgradeAccount = useCallback(async (username: string, pass: string) => {
        const auth = getFirebaseAuth();
        if (!auth || !auth.currentUser) throw new Error("No user to upgrade");

        const email = `${username.toLowerCase()}@safe-anon-chat.com`;
        try {
            const credential = EmailAuthProvider.credential(email, pass);
            await linkWithCredential(auth.currentUser, credential);

            const { createUserProfile } = await import("@/lib/userProfile");
            // Create user profile (isAnonymous: false)
            await createUserProfile(auth.currentUser.uid, username, false);

            // Set local state
            setDisplayName(username);
            setHasProfile(true);
        } catch (error: unknown) {
            throw error;
        }
    }, []);

    const logout = useCallback(async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        await signOut(auth);
        // after signOut, onAuthStateChanged triggers with null, which triggers signInAnonymously
        // So they become a new anonymous user.
        setDisplayName(null);
        setHasProfile(false);
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
        login,
        register,
        upgradeAccount,
        logout,
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
