"use client";

import { getCurrentUser, signOut } from "aws-amplify/auth";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isAuthConfigured } from "@/lib/amplify-client";

type AuthState = "checking" | "signed-in" | "signed-out";

type AuthContextValue = {
  state: AuthState;
  refreshAuth: () => Promise<void>;
  signOutCurrentUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<AuthState>("checking");
  const isPublicPage = pathname.startsWith("/login");

  const refreshAuth = useCallback(async () => {
    if (!isAuthConfigured) {
      setState("signed-out");
      return;
    }
    try {
      await getCurrentUser();
      setState("signed-in");
    } catch {
      setState("signed-out");
    }
  }, []);

  const signOutCurrentUser = useCallback(async () => {
    await signOut();
    setState("signed-out");
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (!isAuthConfigured) {
      Promise.resolve().then(() => setState("signed-out"));
      return;
    }
    getCurrentUser()
      .then(() => setState("signed-in"))
      .catch(() => setState("signed-out"));
  }, []);

  useEffect(() => {
    if (state === "signed-out" && !isPublicPage) router.replace("/login");
    if (state === "signed-in" && isPublicPage) router.replace("/");
  }, [isPublicPage, router, state]);

  const value = useMemo(() => ({ state, refreshAuth, signOutCurrentUser }), [refreshAuth, signOutCurrentUser, state]);

  if (!isPublicPage && state !== "signed-in") {
    return (
      <main className="grid min-h-screen place-items-center px-6" aria-live="polite">
        <p className="text-slate-600">ログイン状態を確認しています…</p>
      </main>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
