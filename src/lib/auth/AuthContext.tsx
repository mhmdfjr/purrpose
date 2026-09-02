"use client";

import * as React from "react";
import {
  onAuthStateChanged,
  User,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  syncSession: (user: User | null) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  syncSession: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // M7 App Check init (non-blocking, graceful if env not set)
    import("@/lib/appCheck").then((m) => m.initAppCheck().catch(() => {}));
  }, []);

  const syncSession = React.useCallback(async (u: User | null) => {
    try {
      if (u) {
        let idToken: string | null = null;
        try {
          idToken = await u.getIdToken();
        } catch (err) {
          // Network or AppCheck failure — retry once without AppCheck, then skip session for local dev
          console.warn("[Auth] getIdToken failed, retrying once", err);
          try {
            // Small delay and retry
            await new Promise((r) => setTimeout(r, 800));
            idToken = await u.getIdToken(true).catch(() => null);
          } catch {}
          if (!idToken) {
            console.warn("[Auth] skipping session sync — will rely on client auth (check AppCheck enforcement or network)");
            return;
          }
        }
        if (!idToken) return;
        await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }).catch((e) => console.warn("[Auth] session fetch failed (non-blocking)", e));
      } else {
        await fetch("/api/session", { method: "DELETE" }).catch(() => {});
      }
    } catch (e) {
      console.warn("[Auth] syncSession failed (non-blocking)", e);
    }
  }, []);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      // Sync cookie on every auth change (helps SSR guard)
      // Don't block UI render; fire and forget but handle errors
      if (u) {
        // Only sync if not already synced? We sync anyway to refresh cookie expiry
        syncSession(u);
      } else {
        syncSession(null);
      }
    });
    return () => unsub();
  }, [syncSession]);

  const signOut = React.useCallback(async () => {
    await firebaseSignOut(auth);
    await syncSession(null);
  }, [syncSession]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, syncSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return React.useContext(AuthContext);
}
