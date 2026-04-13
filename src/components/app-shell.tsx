"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuthContext } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";

function AuthGate({ children }: { children: ReactNode }) {
  const { isOnboarded, teamId } = useAuthContext();
  const pathname = usePathname();

  // Admin doesn't need onboarding
  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  // Join route handles its own flow (onboarding + auto-join)
  if (pathname.startsWith("/join")) {
    return <>{children}</>;
  }

  // Not onboarded and no team → redirect to a "need link" page
  if (!isOnboarded || !teamId) {
    return <NeedInviteLink />;
  }

  // All set — show the app
  return (
    <>
      <main className="pb-24">{children}</main>
      <BottomNav />
    </>
  );
}

function NeedInviteLink() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-6">
        <span className="material-symbols-outlined text-6xl text-primary/40 block">
          qr_code_2
        </span>
        <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
          Young Christian Life
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Scannez le QR code de votre equipe ou utilisez le lien
          d&apos;invitation pour rejoindre l&apos;aventure !
        </p>
        <div className="bg-surface-container rounded-2xl p-5">
          <p className="text-sm text-on-surface-variant">
            Demandez a votre animateur le lien ou le QR code de votre equipe.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
