"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar";

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

    // Check localStorage for admin session
    const isAdmin = localStorage.getItem("ylc_admin_auth") === "true";
    if (isAdmin) {
      setAuthed(true);
    } else {
      setAuthed(false);
      router.replace("/admin/login");
    }
  }, [isPublicRoute, router]);

  // Public routes (login, approve) — no shell
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
