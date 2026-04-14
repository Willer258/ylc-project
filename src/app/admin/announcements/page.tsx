"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface Announcement {
  id: string;
  message: string;
  active: boolean;
  createdAt: number;
}

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "announcements"),
      (snap) => {
        const items = snap.docs
          .filter((d) => d.data().eventId === EVENT_ID)
          .map((d) => ({
            id: d.id,
            message: d.data().message || "",
            active: d.data().active ?? false,
            createdAt: d.data().createdAt?.toMillis?.() || 0,
          }));
        items.sort((a, b) => b.createdAt - a.createdAt);
        setAnnouncements(items);
      }
    );
    return unsub;
  }, []);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await addDoc(collection(db, "announcements"), {
        message: trimmed,
        eventId: EVENT_ID,
        active: true,
        createdAt: serverTimestamp(),
      });
      setMessage("");
    } catch (err) {
      console.error("Error creating announcement:", err);
    }
    setSending(false);
  }

  async function handleToggle(id: string, currentActive: boolean) {
    await updateDoc(doc(db, "announcements", id), { active: !currentActive });
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await deleteDoc(doc(db, "announcements", id));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Annonces</h1>

      {/* Create form */}
      <div className="bg-white/5 border border-white/5 rounded-xl p-5 mb-6">
        <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-2 block">
          Nouvelle annonce
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Tapez votre message..."
            className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400 disabled:opacity-30 transition-colors"
          >
            Envoyer
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {announcements.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-4 bg-white/5 border rounded-xl p-5 transition-colors ${
              a.active ? "border-amber-500/20" : "border-white/5 opacity-50"
            }`}
          >
            <span className="material-symbols-outlined text-amber-400 shrink-0">
              campaign
            </span>
            <p className="flex-1 text-white text-sm">{a.message}</p>

            <button
              onClick={() => handleToggle(a.id, a.active)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                a.active
                  ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "bg-white/5 text-white/30 hover:bg-white/10"
              }`}
            >
              {a.active ? "Active" : "Inactive"}
            </button>

            <button
              onClick={() => handleDelete(a.id)}
              className="text-red-400/60 hover:text-red-400 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">delete</span>
            </button>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-16 text-white/30">
            Aucune annonce.
          </div>
        )}
      </div>
    </div>
  );
}
