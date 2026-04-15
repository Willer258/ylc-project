"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from "qrcode";

interface QRSlot {
  id: string;
  slotCode: string;
  label: string;
  scannedBy: Array<{ teamId: string; timestamp: string }>;
}

export default function AdminQRPage() {
  const [slots, setSlots] = useState<QRSlot[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setBaseUrl(window.location.origin);
    const q = query(collection(db, "qrSlots"), orderBy("slotCode"));
    const unsub = onSnapshot(q, (snap) => {
      setSlots(snap.docs.map((d) => ({
        id: d.id,
        slotCode: d.data().slotCode || d.id,
        label: d.data().label || "",
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

  const totalScans = slots.reduce((s, sl) => s + sl.scannedBy.length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">QR Codes ({slots.length})</h1>
          <p className="text-sm text-white/40 mt-1">
            {totalScans} scan{totalScans !== 1 ? "s" : ""} au total
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
                onClick={() => setShowAll(!showAll)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                  showAll
                    ? "bg-amber-500 text-black"
                    : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                {showAll ? "Masquer les QR" : "Afficher les QR"}
              </button>
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

      {/* Info banner */}
      <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 mb-6">
        <p className="text-sm text-amber-400 font-bold">Comment ca marche</p>
        <p className="text-xs text-white/40 mt-1">
          Chaque QR code est generique. Quand un joueur le scanne, il choisit pour quel mot debloquer un indice.
          Un QR ne peut etre scanne qu&apos;une fois par equipe. Imprimez-les et cachez-les dans le lieu de l&apos;evenement !
        </p>
      </div>

      {/* QR Grid preview */}
      {showAll && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {slots.map((slot) => (
            <QRPreviewCard key={slot.id} slotCode={slot.slotCode} label={slot.label} baseUrl={baseUrl} scans={slot.scannedBy.length} />
          ))}
        </div>
      )}

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
        {slots.map((slot) => (
          <div key={slot.id} className="bg-white/5 border border-white/5 rounded-xl p-4 flex items-center gap-4">
            <div className="shrink-0 w-20 text-center">
              <p className="font-mono font-bold text-amber-400 text-sm">{slot.slotCode}</p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-sm truncate">{slot.label || "—"}</p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
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

      {slots.length > 0 && (
        <div className="mt-6 bg-white/[0.02] rounded-xl p-4 text-xs text-white/20">
          Les QR pointent vers : <code className="text-amber-400/50">{baseUrl}/qr/[CODE]</code>
        </div>
      )}
    </div>
  );
}

// === QR Preview Card ===
function QRPreviewCard({ slotCode, label, baseUrl, scans }: { slotCode: string; label: string; baseUrl: string; scans: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(`${baseUrl}/qr/${slotCode}`, { width: 250, margin: 2 }).then(setDataUrl);
  }, [slotCode, baseUrl]);

  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center gap-2">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR ${slotCode}`} className="w-full aspect-square rounded-lg" />
      ) : (
        <div className="w-full aspect-square rounded-lg bg-white/5 animate-pulse" />
      )}
      <p className="font-mono font-bold text-amber-400 text-sm">{slotCode}</p>
      {label !== slotCode && <p className="text-xs text-white/40 text-center">{label}</p>}
      <p className="text-[10px] text-white/20">{scans} scan{scans !== 1 ? "s" : ""}</p>
    </div>
  );
}
