"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from "qrcode";

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

export default function AdminQRPage() {
  const [slots, setSlots] = useState<QRSlot[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
    const q = query(collection(db, "qrSlots"), orderBy("slotCode"));
    const unsub = onSnapshot(q, (snap) => {
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
    return unsub;
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

  async function handleUpdateSlot(id: string, updates: Partial<QRSlot>) {
    await updateDoc(doc(db, "qrSlots", id), updates);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">QR Codes ({slots.length})</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleBatchCreate(10)}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-bold hover:bg-blue-500/20 disabled:opacity-30"
          >
            + Creer 10 QR
          </button>
          {slots.length > 0 && (
            <button
              onClick={handleDownloadAll}
              className="px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm font-bold hover:bg-emerald-500/20"
            >
              Telecharger tous
            </button>
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

      {/* Slots table */}
      <div className="space-y-2">
        {slots.map((slot) => (
          <div key={slot.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-4">
            <div className="shrink-0 w-16 text-center">
              <p className="font-mono font-bold text-amber-400 text-sm">{slot.slotCode}</p>
            </div>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={slot.label}
                onChange={(e) => handleUpdateSlot(slot.id, { label: e.target.value } as Partial<QRSlot>)}
                className="bg-transparent text-white/60 text-sm focus:outline-none focus:text-white w-full"
                placeholder="Label..."
              />
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded-full ${
                slot.hintType
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-white/5 text-white/20"
              }`}>
                {slot.hintType || "Non assigne"}
              </span>
              <span className="text-xs text-white/20">
                {slot.scannedBy.length} scan{slot.scannedBy.length !== 1 ? "s" : ""}
              </span>
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
        ))}
      </div>

      {slots.length === 0 && (
        <div className="text-center py-16 text-white/30">
          <span className="material-symbols-outlined text-4xl block mb-3">qr_code</span>
          <p>Aucun QR code. Creez-en pour commencer.</p>
        </div>
      )}

      {/* URL info */}
      {slots.length > 0 && (
        <div className="mt-6 bg-white/[0.02] rounded-xl p-4 text-xs text-white/20">
          Les QR pointent vers : <code className="text-amber-400/50">{baseUrl}/qr/[CODE]</code>
        </div>
      )}
    </div>
  );
}
