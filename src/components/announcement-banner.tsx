"use client";

import { useEffect, useState } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Announcement {
  id: string;
  message: string;
}

const EVENT_ID = "event-default";

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      where("eventId", "==", EVENT_ID),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      // Filter active announcements client-side to avoid composite index
      const active = snap.docs.filter((d) => d.data().active === true);
      if (active.length > 0) {
        // Sort by createdAt desc, take most recent
        active.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis?.() || 0;
          const bTime = b.data().createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        const latest = active[0];
        setAnnouncement({ id: latest.id, message: latest.data().message });
        setVisible(true);
      } else {
        setAnnouncement(null);
      }
    });

    return unsub;
  }, []);

  if (!announcement || !visible) return null;

  return (
    <div className="mt-6 mx-auto max-w-4xl">
      <div className="relative bg-primary-fixed rounded-2xl px-6 py-4 flex items-start gap-4">
        <span className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0">
          campaign
        </span>
        <p className="text-on-primary-fixed font-medium text-sm flex-1">
          {announcement.message}
        </p>
        <button
          onClick={() => setVisible(false)}
          className="text-on-primary-fixed/60 hover:text-on-primary-fixed shrink-0"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
}
