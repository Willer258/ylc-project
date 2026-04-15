"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from "qrcode";

const EVENT_ID = "event-default";

interface QRSlot {
  id: string;
  slotCode: string;
  label: string;
  currentGameId: string | null;
  targetPhrase: number | null;
  targetWord: number | null;
  hintType: string | null;
  scannedBy: Array<{ teamId: string; timestamp: Date }>;
}

interface GameTemplate {
  id: string;
  name: string;
  phrases: Array<{
    text: string;
    reference: string;
    words: Array<{
      value: string;
      hints: Array<{ type: string }>;
    }>;
  }>;
}

export default function AdminQRPage() {
  const [slots, setSlots] = useState<QRSlot[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  useEffect(() => {
    setBaseUrl(window.location.origin);

    // Load QR slots
    const q = query(collection(db, "qrSlots"), orderBy("slotCode"));
    const unsub1 = onSnapshot(q, (snap) => {
      setSlots(snap.docs.map((d) => ({
        id: d.id,
        slotCode: d.data().slotCode || d.id,
        label: d.data().label || "",
        currentGameId: d.data().currentGameId || null,
        targetPhrase: d.data().targetPhrase ?? null,
        targetWord: d.data().targetWord ?? null,
        hintType: d.data().hintType || null,
        scannedBy: d.data().scannedBy || [],
      })));
    });

    // Load active game
    const unsub2 = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) setActiveGameId(snap.data().activeGameId || null);
    });

    return () => { unsub1(); unsub2(); };
  }, []);

  // Load templates
  useEffect(() => {
    async function loadTemplates() {
      const snap = await getDocs(collection(db, "gameTemplates"));
      setTemplates(snap.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "Sans nom",
        phrases: d.data().phrases || [],
      })));
    }
    loadTemplates();
  }, []);

  async function handleCreate() {
    if (!newCode.trim() || creating) return;
    setCreating(true);
    try {
      const code = newCode.trim().toUpperCase();
      await addDoc(collection(db, "qrSlots"), {
        slotCode: code,
        label: newLabel.trim() || code,
        currentGameId: null,
        targetPhrase: null,
        targetWord: null,
        hintType: null,
        scannedBy: [],
        createdAt: serverTimestamp(),
      });
      setNewCode("");
      setNewLabel("");
    } catch (err) {
      console.error("Create QR error:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleBatchCreate(count: number) {
    setCreating(true);
    try {
      const existing = slots.length;
      for (let i = 1; i <= count; i++) {
        const num = existing + i;
        const code = `QR-${String(num).padStart(3, "0")}`;
        await addDoc(collection(db, "qrSlots"), {
          slotCode: code,
          label: code,
          currentGameId: null,
          targetPhrase: null,
          targetWord: null,
          hintType: null,
          scannedBy: [],
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Batch create error:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce QR slot ?")) return;
    await deleteDoc(doc(db, "qrSlots", id));
  }

  async function handleAssign(slotId: string, gameId: string | null, phraseIdx: number | null, wordIdx: number | null, hintType: string | null) {
    await updateDoc(doc(db, "qrSlots", slotId), {
      currentGameId: gameId,
      targetPhrase: phraseIdx,
      targetWord: wordIdx,
      hintType,
    });
    setEditingSlot(null);
  }

  async function handleAutoAssign() {
    if (!activeGameId) {
      alert("Aucun jeu actif. Lancez un jeu d'abord.");
      return;
    }
    const template = templates.find((t) => t.id === activeGameId);
    if (!template) {
      alert("Template du jeu actif introuvable.");
      return;
    }

    // Collect all hints across all phrases/words
    const allHints: Array<{ phraseIdx: number; wordIdx: number; hintType: string; wordValue: string }> = [];
    template.phrases.forEach((phrase, pi) => {
      phrase.words.forEach((word, wi) => {
        word.hints.forEach((hint) => {
          allHints.push({ phraseIdx: pi, wordIdx: wi, hintType: hint.type, wordValue: word.value });
        });
      });
    });

    if (allHints.length === 0) {
      alert("Aucun indice configure dans le template.");
      return;
    }

    // Get unassigned slots
    const unassigned = slots.filter((s) => !s.currentGameId);
    if (unassigned.length === 0) {
      alert("Aucun QR non-assigne disponible. Creez-en d'abord.");
      return;
    }

    const toAssign = Math.min(unassigned.length, allHints.length);
    if (!confirm(`Assigner automatiquement ${toAssign} QR codes a ${allHints.length} indices ?`)) return;

    for (let i = 0; i < toAssign; i++) {
      const hint = allHints[i];
      await updateDoc(doc(db, "qrSlots", unassigned[i].id), {
        currentGameId: activeGameId,
        targetPhrase: hint.phraseIdx,
        targetWord: hint.wordIdx,
        hintType: hint.hintType,
        label: `${hint.wordValue} — ${hint.hintType}`,
      });
    }

    if (allHints.length > unassigned.length) {
      alert(`${toAssign} QR assignes. Il manque ${allHints.length - unassigned.length} QR pour couvrir tous les indices.`);
    }
  }

  async function handleClearAssignments() {
    if (!confirm("Retirer toutes les assignations QR ?")) return;
    for (const slot of slots) {
      if (slot.currentGameId) {
        await updateDoc(doc(db, "qrSlots", slot.id), {
          currentGameId: null,
          targetPhrase: null,
          targetWord: null,
          hintType: null,
        });
      }
    }
  }

  async function handleResetScans() {
    if (!confirm("Reinitialiser les scans de tous les QR ?")) return;
    for (const slot of slots) {
      if (slot.scannedBy.length > 0) {
        await updateDoc(doc(db, "qrSlots", slot.id), { scannedBy: [] });
      }
    }
  }

  async function handleDownloadQR(slotCode: string) {
    const url = `${baseUrl}/qr/${slotCode}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slotCode}.png`;
    a.click();
  }

  async function handleDownloadAll() {
    for (const slot of slots) {
      await handleDownloadQR(slot.slotCode);
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  // Get template for currently editing slot
  function getTemplateForSlot(slot: QRSlot) {
    if (slot.currentGameId) return templates.find((t) => t.id === slot.currentGameId);
    if (activeGameId) return templates.find((t) => t.id === activeGameId);
    return templates[0];
  }

  const assignedCount = slots.filter((s) => s.currentGameId).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">QR Codes ({slots.length})</h1>
          <p className="text-sm text-white/40 mt-1">
            {assignedCount} assigne{assignedCount !== 1 ? "s" : ""} · {slots.length - assignedCount} libre{slots.length - assignedCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleBatchCreate(10)}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-bold hover:bg-blue-500/20 disabled:opacity-30"
          >
            + Creer 10 QR
          </button>
          {slots.length > 0 && (
            <>
              <button
                onClick={handleDownloadAll}
                className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20"
              >
                Telecharger tous
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Supprimer les ${slots.length} QR codes ?`)) return;
                  for (const s of slots) await deleteDoc(doc(db, "qrSlots", s.id));
                }}
                className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm font-bold hover:bg-red-500/20"
              >
                Tout supprimer
              </button>
            </>
          )}
        </div>
      </div>

      {/* Auto-assign bar */}
      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-amber-400">Assignation automatique</p>
          <p className="text-xs text-white/40 mt-0.5">
            {activeGameId
              ? `Jeu actif : ${templates.find((t) => t.id === activeGameId)?.name || activeGameId}`
              : "Aucun jeu actif — lancez un jeu dans le Panneau Live"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAutoAssign}
            disabled={!activeGameId}
            className="px-4 py-2 rounded-lg bg-amber-500 text-black text-sm font-bold hover:bg-amber-400 disabled:opacity-30 transition-colors"
          >
            Auto-assigner
          </button>
          {assignedCount > 0 && (
            <>
              <button
                onClick={handleClearAssignments}
                className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm font-bold hover:bg-white/10"
              >
                Retirer tout
              </button>
              <button
                onClick={handleResetScans}
                className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm font-bold hover:bg-white/10"
              >
                Reset scans
              </button>
            </>
          )}
        </div>
      </div>

      {/* Manual create */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Code (ex: QR-001)"
          className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label (ex: Pilier gauche)"
          className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
        />
        <button
          onClick={handleCreate}
          disabled={!newCode.trim() || creating}
          className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-30"
        >
          + Creer
        </button>
      </div>

      {/* Slots list */}
      <div className="space-y-2">
        {slots.map((slot) => {
          const isEditing = editingSlot === slot.id;
          const template = getTemplateForSlot(slot);

          return (
            <div key={slot.id} className="bg-white/5 border border-white/5 rounded-xl overflow-hidden">
              {/* Main row */}
              <div className="p-4 flex items-center gap-4">
                <div className="shrink-0 w-20 text-center">
                  <p className="font-mono font-bold text-amber-400 text-sm">{slot.slotCode}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-sm truncate">{slot.label || "—"}</p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {slot.currentGameId ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check</span>
                      {slot.hintType}
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/20">
                      Non assigne
                    </span>
                  )}
                  <span className="text-xs text-white/20">
                    {slot.scannedBy.length} scan{slot.scannedBy.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => setEditingSlot(isEditing ? null : slot.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isEditing ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/40 hover:text-white/70"
                    }`}
                    title="Configurer"
                  >
                    <span className="material-symbols-outlined text-lg">tune</span>
                  </button>
                  <button
                    onClick={() => handleDownloadQR(slot.slotCode)}
                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white/70"
                    title="Telecharger QR"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                  </button>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    className="p-2 rounded-lg bg-white/5 text-white/20 hover:text-red-400"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {isEditing && template && (
                <AssignPanel
                  slot={slot}
                  template={template}
                  onAssign={(phraseIdx, wordIdx, hintType) =>
                    handleAssign(slot.id, template.id, phraseIdx, wordIdx, hintType)
                  }
                  onClear={() => handleAssign(slot.id, null, null, null, null)}
                />
              )}
            </div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <span className="material-symbols-outlined text-4xl block mb-3">qr_code</span>
          <p>Aucun QR code. Creez-en pour commencer.</p>
        </div>
      )}

      {slots.length > 0 && (
        <div className="mt-6 bg-white/[0.02] rounded-xl p-4 text-xs text-white/20">
          Les QR pointent vers : <code className="text-amber-400/50">{baseUrl}/qr/[CODE]</code>
        </div>
      )}
    </div>
  );
}

// === Assignment Panel ===
function AssignPanel({
  slot,
  template,
  onAssign,
  onClear,
}: {
  slot: QRSlot;
  template: GameTemplate;
  onAssign: (phraseIdx: number, wordIdx: number, hintType: string) => void;
  onClear: () => void;
}) {
  const [selPhrase, setSelPhrase] = useState<number>(slot.targetPhrase ?? 0);
  const [selWord, setSelWord] = useState<number>(slot.targetWord ?? 0);
  const [selHint, setSelHint] = useState<string>(slot.hintType || "");

  const phrase = template.phrases[selPhrase];
  const word = phrase?.words?.[selWord];
  const hints = word?.hints || [];

  return (
    <div className="border-t border-white/5 bg-white/[0.02] p-4 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {/* Phrase select */}
        <div>
          <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1 block">
            Phrase
          </label>
          <select
            value={selPhrase}
            onChange={(e) => { setSelPhrase(Number(e.target.value)); setSelWord(0); setSelHint(""); }}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            {template.phrases.map((p, i) => (
              <option key={i} value={i}>
                #{i + 1} — {p.text.substring(0, 30)}{p.text.length > 30 ? "..." : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Word select */}
        <div>
          <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1 block">
            Mot
          </label>
          <select
            value={selWord}
            onChange={(e) => { setSelWord(Number(e.target.value)); setSelHint(""); }}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            {phrase?.words?.map((w, i) => (
              <option key={i} value={i}>
                {w.value} ({w.hints.length} indice{w.hints.length !== 1 ? "s" : ""})
              </option>
            )) || <option>—</option>}
          </select>
        </div>

        {/* Hint type select */}
        <div>
          <label className="text-[10px] text-white/30 font-bold uppercase tracking-widest mb-1 block">
            Type d&apos;indice
          </label>
          <select
            value={selHint}
            onChange={(e) => setSelHint(e.target.value)}
            className="w-full bg-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            <option value="">Choisir...</option>
            {hints.map((h, i) => (
              <option key={i} value={h.type}>{h.type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      {word && (
        <div className="text-xs text-white/30">
          Mot : <span className="text-white/60 font-mono">{word.value}</span>
          {" · "}Indices : {hints.map((h) => h.type).join(", ") || "aucun"}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAssign(selPhrase, selWord, selHint)}
          disabled={!selHint}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-400 disabled:opacity-30 transition-colors"
        >
          Assigner
        </button>
        {slot.currentGameId && (
          <button
            onClick={onClear}
            className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm font-bold hover:bg-white/10"
          >
            Retirer l&apos;assignation
          </button>
        )}
      </div>
    </div>
  );
}
