"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AdminSidebar } from "@/components/admin/sidebar";

const ADMIN_EMAIL = "wilfriedhouinlindjonon91@gmail.com";
const PUBLIC_ROUTES = ["/admin/login", "/admin/auth/callback"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (isPublicRoute) {
      setAuthed(false);
      return;
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && user.email === ADMIN_EMAIL) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace("/admin/login");
      }
    });

    return unsub;
  }, [isPublicRoute, router]);

  // Public routes (login, callback) — no shell
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Loading
  if (authed === null) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0F1117]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not authed
  if (!authed) return null;

  // Admin shell
  return (
    <div className="min-h-dvh bg-[#0F1117] text-white flex">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
