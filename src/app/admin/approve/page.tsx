"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdminRequest {
  id: string;
  name: string;
  otp: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export default function AdminApprovePage() {
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");

  // Simple password gate (use ADMIN_PASSWORD from env or fallback)
  function handleAuth() {
    // Accept any of these passwords
    const validPasswords = ["ylc-admin-2026", "ylc"];
    if (validPasswords.includes(password)) {
      setAuthed(true);
    }
  }

  useEffect(() => {
    if (!authed) return;

    const q = query(
      collection(db, "adminRequests"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setRequests(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Inconnu",
          otp: d.data().otp || "—",
          status: d.data().status || "pending",
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
        }))
      );
    });

    return unsub;
  }, [authed]);

  async function handleApprove(requestId: string) {
    await updateDoc(doc(db, "adminRequests", requestId), {
      status: "approved",
    });
  }

  async function handleReject(requestId: string) {
    await deleteDoc(doc(db, "adminRequests", requestId));
  }

  async function handleClearAll() {
    if (!confirm("Supprimer toutes les demandes ?")) return;
    for (const req of requests) {
      await deleteDoc(doc(db, "adminRequests", req.id));
    }
  }

  if (!authed) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#0F1117] px-6">
        <div className="w-full max-w-xs space-y-6">
          <h1 className="text-xl font-bold text-white text-center">Approbation Admin</h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full bg-white/5 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
            onKeyDown={(e) => e.key === "Enter" && handleAuth()}
          />
          <button
            onClick={handleAuth}
            className="w-full py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400"
          >
            Acceder
          </button>
        </div>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");

  return (
    <div className="min-h-dvh bg-[#0F1117] text-white px-6 py-8 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Demandes d&apos;acces</h1>
        {requests.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-white/30 hover:text-red-400"
          >
            Tout effacer
          </button>
        )}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
            En attente ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((req) => (
              <div
                key={req.id}
                className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-lg">{req.name}</p>
                    <p className="text-xs text-white/30">
                      {req.createdAt.toLocaleTimeString("fr-FR")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/30 mb-1">Code OTP</p>
                    <p className="text-3xl font-mono font-bold text-amber-400 tracking-widest">
                      {req.otp}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-sm hover:bg-emerald-500/30 transition-colors"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex-1 py-2.5 rounded-lg bg-red-500/10 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors"
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3">
            Approuves ({approved.length})
          </h2>
          <div className="space-y-2">
            {approved.map((req) => (
              <div
                key={req.id}
                className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-white/70">{req.name}</p>
                  <p className="text-xs text-white/20">
                    {req.createdAt.toLocaleTimeString("fr-FR")}
                  </p>
                </div>
                <span className="text-xs text-emerald-400 font-bold">Connecte</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {requests.length === 0 && (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-white/10 block mb-3">
            notifications
          </span>
          <p className="text-white/30">Aucune demande en attente.</p>
          <p className="text-white/15 text-sm mt-2">
            Les demandes apparaitront ici en temps reel.
          </p>
        </div>
      )}
    </div>
  );
}
