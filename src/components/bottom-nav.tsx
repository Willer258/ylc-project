"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/aventure", label: "Aventure", icon: "explore" },
  { href: "/jeu", label: "Jeu", icon: "sports_esports" },
  { href: "/photos", label: "Photos", icon: "photo_camera" },
  { href: "/avis", label: "Avis", icon: "reviews" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // Hide nav on admin pages
  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-surface/90 backdrop-blur-xl rounded-t-2xl shadow-[0_-4px_24px_rgba(29,27,25,0.04)]">
      {tabs.map((tab) => {
        const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center rounded-full px-3 py-1 transition-colors duration-300 active:scale-90 ${
              isActive
                ? "bg-surface-container text-primary"
                : "text-on-surface/40 hover:text-primary"
            }`}
          >
            <span
              className="material-symbols-outlined text-2xl"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {tab.icon}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest mt-1">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
