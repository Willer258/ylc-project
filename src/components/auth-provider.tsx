"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAuth, type AuthState } from "@/hooks/use-auth";

interface AuthContextValue extends AuthState {
  setUserName: (name: string) => void;
  setTeamId: (teamId: string) => void;
  clearTeamId: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!auth.isReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
