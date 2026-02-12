"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    onAuthStateChanged,
    signInAnonymously,
    type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

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
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    uid: null,
    loading: true,
    isAuthenticated: false,
    isAnonymous: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

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

    const value: AuthContextType = {
        user,
        uid: user?.uid ?? null,
        loading,
        isAuthenticated: !!user,
        isAnonymous: user?.isAnonymous ?? false,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth state anywhere in the app.
 *
 * @example
 * const { uid, loading, isAuthenticated } = useAuth();
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
