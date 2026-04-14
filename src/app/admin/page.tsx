"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface Stats {
  teams: number;
  members: number;
  photos: number;
  reviews: number;
  timelinePosition: string;
  gameStatus: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    teams: 0,
    members: 0,
    photos: 0,
    reviews: 0,
    timelinePosition: "accueil",
    gameStatus: "inactive",
  });

  useEffect(() => {
    // Listen to event
    const eventUnsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        setStats((prev) => ({
          ...prev,
          timelinePosition: snap.data().timelinePosition || "accueil",
          gameStatus: snap.data().activeGameId ? "active" : "inactive",
        }));
      }
    });

    // Count collections
    async function loadCounts() {
      try {
        const [teamsSnap, photosSnap, reviewsSnap] = await Promise.all([
          getCountFromServer(collection(db, "events", EVENT_ID, "teams")),
          getCountFromServer(collection(db, "events", EVENT_ID, "photos")),
          getCountFromServer(collection(db, "events", EVENT_ID, "reviews")),
        ]);
        setStats((prev) => ({
          ...prev,
          teams: teamsSnap.data().count,
          photos: photosSnap.data().count,
          reviews: reviewsSnap.data().count,
        }));
      } catch (err) {
        console.error("Count error:", err);
      }
    }

    loadCounts();
    return eventUnsub;
  }, []);

  const CARDS = [
    { label: "Equipes", value: stats.teams, icon: "groups", color: "bg-blue-500/10 text-blue-400" },
    { label: "Photos", value: stats.photos, icon: "photo_library", color: "bg-purple-500/10 text-purple-400" },
    { label: "Avis", value: stats.reviews, icon: "reviews", color: "bg-emerald-500/10 text-emerald-400" },
    { label: "Timeline", value: stats.timelinePosition, icon: "schedule", color: "bg-amber-500/10 text-amber-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {CARDS.map((card) => (
          <div
            key={card.label}
            className="bg-white/5 rounded-xl p-5 border border-white/5"
          >
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <span className="material-symbols-outlined text-lg">{card.icon}</span>
            </div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
              {card.label}
            </p>
            <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-bold mb-4 text-white/70">Actions rapides</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Gerer la timeline", href: "/admin/timeline", icon: "schedule" },
          { label: "Configurer le jeu", href: "/admin/game/templates", icon: "sports_esports" },
          { label: "Voir les photos", href: "/admin/photos", icon: "photo_library" },
          { label: "Gerer les equipes", href: "/admin/teams", icon: "groups" },
          { label: "Panneau live", href: "/admin/game/live", icon: "stream" },
          { label: "Voir les avis", href: "/admin/reviews", icon: "reviews" },
        ].map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-xl p-4 border border-white/5 transition-colors"
          >
            <span className="material-symbols-outlined text-amber-400">{action.icon}</span>
            <span className="text-sm text-white/70">{action.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
