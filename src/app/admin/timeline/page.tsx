"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, addDoc, deleteDoc, collection, query, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface TimelineStep {
  id: string;
  title: string;
  time: string;
  order: number;
}

export default function AdminTimelinePage() {
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [currentPosition, setCurrentPosition] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [sending, setSending] = useState(false);

  // Edit/Add state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editTime, setEditTime] = useState("");
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("");

  // Load timeline steps from Firestore
  useEffect(() => {
    const q = query(collection(db, "events", EVENT_ID, "timeline"), orderBy("order"));
    const unsub = onSnapshot(q, (snap) => {
      setSteps(snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "",
        time: d.data().time || "",
        order: d.data().order ?? 0,
      })));
    });
    return unsub;
  }, []);

  // Load current position
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        setCurrentPosition(snap.data().timelinePosition || "");
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

  async function handleAddStep() {
    if (!newTitle.trim() || !newTime.trim()) return;
    await addDoc(collection(db, "events", EVENT_ID, "timeline"), {
      title: newTitle.trim(),
      time: newTime.trim(),
      order: steps.length,
      createdAt: serverTimestamp(),
    });
    setNewTitle("");
    setNewTime("");
    setAdding(false);
  }

  async function handleUpdateStep(id: string) {
    if (!editTitle.trim() || !editTime.trim()) return;
    await updateDoc(doc(db, "events", EVENT_ID, "timeline", id), {
      title: editTitle.trim(),
      time: editTime.trim(),
    });
    setEditingId(null);
  }

  async function handleDeleteStep(id: string) {
    if (!confirm("Supprimer cette etape ?")) return;
    await deleteDoc(doc(db, "events", EVENT_ID, "timeline", id));
    // If deleted step was current, reset
    if (currentPosition === id) {
      await updateDoc(doc(db, "events", EVENT_ID), { timelinePosition: "" });
    }
  }

  async function handleMoveStep(id: string, direction: "up" | "down") {
    const idx = steps.findIndex((s) => s.id === id);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= steps.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    await updateDoc(doc(db, "events", EVENT_ID, "timeline", steps[idx].id), { order: steps[swapIdx].order });
    await updateDoc(doc(db, "events", EVENT_ID, "timeline", steps[swapIdx].id), { order: steps[idx].order });
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

  const currentIndex = steps.findIndex((s) => s.id === currentPosition);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Timeline</h1>
        <button
          onClick={() => setAdding(!adding)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            adding ? "bg-white/10 text-white/60" : "bg-amber-500 text-black hover:bg-amber-400"
          }`}
        >
          {adding ? "Annuler" : "+ Ajouter une etape"}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-white/5 border border-amber-500/20 rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1 block">
                Horaire
              </label>
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="Ex: 15h00–15h30"
                className="w-full bg-white/5 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1 block">
                Titre
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Accueil & Installation"
                className="w-full bg-white/5 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                onKeyDown={(e) => e.key === "Enter" && handleAddStep()}
              />
            </div>
          </div>
          <button
            onClick={handleAddStep}
            disabled={!newTitle.trim() || !newTime.trim()}
            className="px-6 py-2.5 rounded-lg bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-30 transition-colors"
          >
            Ajouter
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Timeline steps */}
        <div className="md:col-span-2 space-y-2">
          {steps.map((step, i) => {
            const isCurrent = step.id === currentPosition;
            const isPast = currentIndex >= 0 && i < currentIndex;
            const isEditing = editingId === step.id;

            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-amber-500/10 border-amber-500/30"
                    : isPast
                    ? "bg-white/5 border-white/5"
                    : "bg-white/[0.02] border-white/5"
                }`}
              >
                {isEditing ? (
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        placeholder="Horaire"
                        className="bg-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                      />
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Titre"
                        className="bg-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateStep(step.id)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateStep(step.id)}
                        className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400"
                      >
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm font-bold hover:bg-white/10"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 p-4">
                    {/* Step number / check */}
                    <button
                      onClick={() => handleChangeStep(step.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                        isCurrent
                          ? "bg-amber-500 text-black"
                          : isPast
                          ? "bg-white/10 text-white/40"
                          : "bg-white/5 text-white/30 hover:bg-white/10"
                      }`}
                      title="Marquer comme etape actuelle"
                    >
                      {isPast ? (
                        <span className="material-symbols-outlined text-sm">check</span>
                      ) : (
                        i + 1
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isCurrent ? "text-amber-400" : isPast ? "text-white/40" : "text-white/60"}`}>
                        {step.title}
                      </p>
                      <p className={`text-xs ${isCurrent ? "text-amber-400/60" : "opacity-40"}`}>
                        {step.time}
                      </p>
                    </div>

                    {/* Current badge */}
                    {isCurrent && (
                      <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full shrink-0">
                        EN COURS
                      </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleMoveStep(step.id, "up")}
                        disabled={i === 0}
                        className="p-1.5 rounded-lg text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"
                        title="Monter"
                      >
                        <span className="material-symbols-outlined text-base">arrow_upward</span>
                      </button>
                      <button
                        onClick={() => handleMoveStep(step.id, "down")}
                        disabled={i === steps.length - 1}
                        className="p-1.5 rounded-lg text-white/20 hover:text-white/60 disabled:opacity-20 transition-colors"
                        title="Descendre"
                      >
                        <span className="material-symbols-outlined text-base">arrow_downward</span>
                      </button>
                      <button
                        onClick={() => { setEditingId(step.id); setEditTitle(step.title); setEditTime(step.time); }}
                        className="p-1.5 rounded-lg text-white/20 hover:text-amber-400 transition-colors"
                        title="Modifier"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteStep(step.id)}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 transition-colors"
                        title="Supprimer"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {steps.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <span className="material-symbols-outlined text-4xl block mb-3">schedule</span>
              <p>Aucune etape. Ajoutez-en pour construire votre timeline.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Current step card */}
          {currentIndex >= 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
              <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-2">
                Etape actuelle
              </p>
              <p className="text-lg font-bold text-white">
                {steps[currentIndex]?.title || "—"}
              </p>
              <p className="text-sm text-white/40 mt-1">
                {steps[currentIndex]?.time || "—"}
              </p>
              <p className="text-xs text-white/30 mt-3">
                Etape {currentIndex + 1} / {steps.length}
              </p>
            </div>
          )}

          {/* Quick nav */}
          {steps.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => currentIndex > 0 && handleChangeStep(steps[currentIndex - 1].id)}
                disabled={currentIndex <= 0}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 text-sm font-bold hover:bg-white/10 disabled:opacity-30 transition-colors"
              >
                ← Precedent
              </button>
              <button
                onClick={() =>
                  currentIndex < steps.length - 1 && handleChangeStep(steps[currentIndex + 1].id)
                }
                disabled={currentIndex >= steps.length - 1}
                className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 disabled:opacity-30 transition-colors"
              >
                Suivant →
              </button>
            </div>
          )}

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
