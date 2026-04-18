"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, where, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

interface Announcement {
  id: string;
  message: string;
}

const EVENT_ID = "event-default";
const AUTO_DISMISS_MS = 10000;

export function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      where("eventId", "==", EVENT_ID),
      limit(10)
    );

    const unsub = onSnapshot(q, (snap) => {
      const active = snap.docs.filter((d) => d.data().active === true);
      if (active.length > 0) {
        active.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis?.() || 0;
          const bTime = b.data().createdAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        const latest = active[0];
        const newId = latest.id;

        // Only show popup if it's a NEW announcement
        if (newId !== prevIdRef.current) {
          prevIdRef.current = newId;
          setAnnouncement({ id: newId, message: latest.data().message });
          setVisible(true);

          // Auto-dismiss
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);

          // Vibrate if available
          if (navigator.vibrate) navigator.vibrate(200);
        }
      } else {
        setVisible(false);
        setAnnouncement(null);
        prevIdRef.current = null;
      }
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && announcement && (
        <motion.div
          className="fixed top-4 left-4 right-4 z-[60] flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -80 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="w-full max-w-md bg-on-surface text-background rounded-2xl px-5 py-4 shadow-2xl pointer-events-auto">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-400 text-xl mt-0.5 shrink-0">
                campaign
              </span>
              <p className="font-body font-medium text-sm flex-1 leading-relaxed">
                {announcement.message}
              </p>
              <button
                onClick={() => {
                  setVisible(false);
                  if (timerRef.current) clearTimeout(timerRef.current);
                }}
                className="text-background/40 hover:text-background shrink-0 mt-0.5"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              className="mt-3 h-0.5 bg-amber-400/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-amber-400 rounded-full"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
