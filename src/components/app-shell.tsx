"use client";

import { type ReactNode, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AuthProvider, useAuthContext } from "@/components/auth-provider";
import { BottomNav } from "@/components/bottom-nav";
import { QrScanner } from "@/components/qr-scanner";

const EVENT_ID = "event-default";

function MembershipGuard() {
  const { uuid, teamId, logout } = useAuthContext();

  useEffect(() => {
    if (!teamId || !uuid) return;
    // Listen to this user's member doc in their team
    const memberRef = doc(db, "events", EVENT_ID, "teams", teamId, "members", uuid);
    const unsub = onSnapshot(memberRef, (snap) => {
      if (!snap.exists()) {
        // Member or team was removed → full disconnect
        logout();
      }
    });
    return unsub;
  }, [teamId, uuid, logout]);

  return null;
}

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

  // All set — show the app with membership guard
  return (
    <>
      <MembershipGuard />
      <main className="pb-24">{children}</main>
      <BottomNav />
    </>
  );
}

function NeedInviteLink() {
  const [scanning, setScanning] = useState(false);
  const { userName, isOnboarded, logout } = useAuthContext();
  const router = useRouter();

  const handleScan = useCallback(
    (data: string) => {
      setScanning(false);
      // Extract teamId from URL (e.g. https://…/join/TEAM_ID) or raw teamId
      const joinMatch = data.match(/\/join\/([a-zA-Z0-9_-]+)/);
      if (joinMatch) {
        router.push(`/join/${joinMatch[1]}`);
      } else if (data.length > 5) {
        // Assume raw teamId
        router.push(`/join/${data}`);
      }
    },
    [router]
  );

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm text-center space-y-6">
        <span className="material-symbols-outlined text-6xl text-primary/40 block">
          qr_code_2
        </span>
        <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
          Young Christian Lifestyle
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Scannez le QR code de votre equipe pour rejoindre l&apos;aventure !
        </p>

        {/* Scan button */}
        <button
          onClick={() => setScanning(true)}
          className="w-full py-4 rounded-full gradient-cta text-on-primary font-bold text-lg transition-all hover:opacity-90 active:scale-95"
        >
          <span className="material-symbols-outlined text-xl align-middle mr-2">
            qr_code_scanner
          </span>
          Scanner le QR code
        </button>

        <div className="bg-surface-container rounded-2xl p-5">
          <p className="text-sm text-on-surface-variant">
            Demandez a votre animateur le QR code de votre equipe.
          </p>
        </div>

        {/* Disconnect button for players with session but no team */}
        {isOnboarded && (
          <button
            onClick={logout}
            className="text-on-surface-variant/50 text-sm hover:text-on-surface-variant transition-colors"
          >
            {userName ? `Connecte en tant que ${userName} — ` : ""}Se deconnecter
          </button>
        )}
      </div>

      {/* QR Scanner overlay */}
      {scanning && (
        <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
      )}
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
