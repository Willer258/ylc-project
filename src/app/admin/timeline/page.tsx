"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

const STEPS = [
  { id: "accueil", time: "15h00–15h30", title: "Accueil & Installation" },
  { id: "priere", time: "15h30–15h50", title: "Priere & Mot d'ouverture" },
  { id: "cocktail", time: "15h50–16h15", title: "Cocktail & Networking" },
  { id: "quiz-culture", time: "16h15–16h30", title: "Quiz Culture Generale" },
  { id: "panel", time: "16h30–17h20", title: "Panel & Reseau Pro" },
  { id: "animation-table", time: "17h20–17h35", title: "Animation & Jeux de table" },
  { id: "quiz-bible", time: "17h35–18h00", title: "Quiz Biblique" },
  { id: "defile", time: "18h00–18h40", title: "Prestation & Defile" },
  { id: "jeux-saut", time: "18h40–19h10", title: "Jeux de saut & Devinettes" },
  { id: "buffet", time: "19h10–19h50", title: "Ouverture du Buffet" },
  { id: "tournoi", time: "19h50–20h10", title: "Tournoi & Jeu Alphabet" },
  { id: "concert", time: "20h10–20h40", title: "Concert" },
  { id: "jeu-global", time: "20h40–20h50", title: "Jeu Global" },
  { id: "cloture", time: "20h50–21h00", title: "Mot de Fin" },
];

export default function AdminTimelinePage() {
  const [currentPosition, setCurrentPosition] = useState("accueil");
  const [announcement, setAnnouncement] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        setCurrentPosition(snap.data().timelinePosition || "accueil");
      }
    });
    return unsub;
  }, []);

  async function handleChangeStep(stepId: string) {
    if (stepId === currentPosition) return;
    await updateDoc(doc(db, "events", EVENT_ID), {
      timelinePosition: stepId,
    });
  }

  async function handleSendAnnouncement() {
    if (!announcement.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "announcements"), {
        eventId: EVENT_ID,
        message: announcement.trim(),
        createdAt: serverTimestamp(),
        active: true,
      });
      setAnnouncement("");
    } catch (err) {
      console.error("Announcement error:", err);
    } finally {
      setSending(false);
    }
  }

  const currentIndex = STEPS.findIndex((s) => s.id === currentPosition);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Timeline</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timeline steps */}
        <div className="md:col-span-2 space-y-2">
          {STEPS.map((step, i) => {
            const isCurrent = step.id === currentPosition;
            const isPast = i < currentIndex;

            return (
              <button
                key={step.id}
                onClick={() => handleChangeStep(step.id)}
                className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : isPast
                    ? "bg-white/5 border-white/5 text-white/40"
                    : "bg-white/[0.02] border-white/5 text-white/60 hover:bg-white/5"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? "bg-amber-500 text-black"
                      : isPast
                      ? "bg-white/10 text-white/40"
                      : "bg-white/5 text-white/30"
                  }`}
                >
                  {isPast ? (
                    <span className="material-symbols-outlined text-sm">check</span>
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{step.title}</p>
                  <p className="text-xs opacity-60">{step.time}</p>
                </div>
                {isCurrent && (
                  <span className="text-xs font-bold bg-amber-500/20 px-2 py-1 rounded-full">
                    EN COURS
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar controls */}
        <div className="space-y-6">
          {/* Current step card */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
            <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-2">
              Etape actuelle
            </p>
            <p className="text-lg font-bold text-white">
              {STEPS[currentIndex]?.title || "—"}
            </p>
            <p className="text-sm text-white/40 mt-1">
              {STEPS[currentIndex]?.time || "—"}
            </p>
            <p className="text-xs text-white/30 mt-3">
              Etape {currentIndex + 1} / {STEPS.length}
            </p>
          </div>

          {/* Quick nav */}
          <div className="flex gap-2">
            <button
              onClick={() => currentIndex > 0 && handleChangeStep(STEPS[currentIndex - 1].id)}
              disabled={currentIndex === 0}
              className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-bold hover:bg-white/10 disabled:opacity-30 transition-colors"
            >
              ← Precedent
            </button>
            <button
              onClick={() =>
                currentIndex < STEPS.length - 1 && handleChangeStep(STEPS[currentIndex + 1].id)
              }
              disabled={currentIndex === STEPS.length - 1}
              className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 disabled:opacity-30 transition-colors"
            >
              Suivant →
            </button>
          </div>

          {/* Announcement */}
          <div className="bg-white/5 border border-white/5 rounded-xl p-5 space-y-3">
            <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
              Annonce rapide
            </p>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="Ecrivez votre annonce..."
              rows={3}
              className="w-full bg-white/5 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none"
            />
            <button
              onClick={handleSendAnnouncement}
              disabled={!announcement.trim() || sending}
              className="w-full py-2.5 rounded-lg bg-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/30 disabled:opacity-30 transition-colors"
            >
              {sending ? "Envoi..." : "Envoyer a tous"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
