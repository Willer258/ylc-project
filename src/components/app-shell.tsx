"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuthContext } from "@/components/auth-provider";
import { Onboarding } from "@/components/onboarding";
import { TeamSelection } from "@/components/team-selection";
import { BottomNav } from "@/components/bottom-nav";

function AuthGate({ children }: { children: ReactNode }) {
  const { isOnboarded, teamId } = useAuthContext();
  const pathname = usePathname();

  // Admin doesn't need onboarding
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  // Step 1: Need to enter name
  if (!isOnboarded) {
    return <Onboarding />;
  }

  // Step 2: Need to join a team
  if (!teamId) {
    return <TeamSelection />;
  }

  // Step 3: All set — show the app
  return (
    <>
      <main className="pb-24">{children}</main>
      <BottomNav />
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
