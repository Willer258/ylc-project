"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/timeline", label: "Timeline", icon: "schedule" },
  { href: "/admin/teams", label: "Equipes", icon: "groups" },
  { href: "/admin/game/templates", label: "Jeu — Templates", icon: "sports_esports" },
  { href: "/admin/game/qr", label: "Jeu — QR Codes", icon: "qr_code" },
  { href: "/admin/game/live", label: "Jeu — Live", icon: "stream" },
  { href: "/admin/photos", label: "Photos", icon: "photo_library" },
  { href: "/admin/reviews", label: "Avis", icon: "reviews" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await signOut(auth);
    window.localStorage.removeItem("ylc_admin_auth");
    router.replace("/admin/login");
  }

  return (
    <aside className="w-56 shrink-0 bg-[#13151B] border-r border-white/5 flex flex-col h-dvh sticky top-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <h1 className="text-lg font-extrabold text-amber-400 tracking-tight">
          YLC Admin
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? "text-amber-400 bg-amber-400/10"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Live indicator + Logout */}
      <div className="border-t border-white/5 p-4 space-y-3">
        <Link
          href="/admin/game/live"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 w-full text-white/30 text-sm hover:text-white/60 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          Deconnexion
        </button>
      </div>
    </aside>
  );
}
