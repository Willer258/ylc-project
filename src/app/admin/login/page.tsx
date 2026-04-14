"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "waiting" | "verify">("request");
  const [name, setName] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if already authed
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("ylc_admin_auth") === "true") {
      router.replace("/admin");
    }
  }, [router]);

  // Listen for approval
  useEffect(() => {
    if (!requestId) return;
    const unsub = onSnapshot(doc(db, "adminRequests", requestId), (snap) => {
      if (snap.exists() && snap.data().status === "approved") {
        localStorage.setItem("ylc_admin_auth", "true");
        localStorage.setItem("ylc_admin_name", snap.data().name || "Admin");
        router.replace("/admin");
      }
    });
    return unsub;
  }, [requestId, router]);

  async function handleRequest() {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const otp = generateOTP();
      const docRef = await addDoc(collection(db, "adminRequests"), {
        name: name.trim(),
        otp,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setRequestId(docRef.id);
      setStep("verify");
    } catch (err) {
      console.error("Request error:", err);
      setError("Erreur lors de la demande. Reessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOTP() {
    if (!otpInput.trim() || !requestId) return;
    setError(null);

    try {
      // Read the request to check OTP
      const { getDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "adminRequests", requestId));
      if (!snap.exists()) {
        setError("Demande introuvable.");
        return;
      }

      const data = snap.data();
      if (data.otp === otpInput.trim()) {
        // OTP correct — mark as approved
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "adminRequests", requestId), {
          status: "approved",
        });
        localStorage.setItem("ylc_admin_auth", "true");
        localStorage.setItem("ylc_admin_name", data.name || "Admin");
        router.replace("/admin");
      } else {
        setError("Code incorrect. Verifiez avec l'administrateur.");
      }
    } catch (err) {
      console.error("Verify error:", err);
      setError("Erreur de verification.");
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#0F1117] px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            YLC Admin
          </h1>
          <p className="text-white/50 text-sm">
            Panneau d&apos;administration
          </p>
        </div>

        {step === "request" && (
          <div className="space-y-6">
            <div>
              <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-2 block">
                Votre nom
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Entrez votre nom"
                autoFocus
                className="w-full bg-white/5 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                onKeyDown={(e) => e.key === "Enter" && handleRequest()}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleRequest}
              disabled={!name.trim() || loading}
              className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi..." : "Demander l'acces"}
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center space-y-3">
              <span className="material-symbols-outlined text-amber-400 text-4xl block">
                hourglass_top
              </span>
              <p className="text-amber-300 font-medium">
                Demande envoyee !
              </p>
              <p className="text-white/40 text-sm">
                Demandez le code a l&apos;administrateur puis entrez-le ci-dessous.
              </p>
            </div>

            <div>
              <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-2 block">
                Code OTP
              </label>
              <input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                className="w-full bg-white/5 rounded-xl px-4 py-4 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder:text-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={otpInput.length !== 6}
              className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              Verifier le code
            </button>

            <button
              onClick={() => { setStep("request"); setRequestId(null); setOtpInput(""); }}
              className="w-full text-center text-white/30 text-sm hover:text-white/50"
            >
              Annuler et recommencer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
