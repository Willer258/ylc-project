"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, doc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import emailjs from "@emailjs/browser";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const EMAILJS_SERVICE = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [name, setName] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Check if already authed
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("ylc_admin_auth") === "true") {
      router.replace("/admin");
    }
  }, [router]);

  // Listen for external approval (if admin approves from their side)
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
      const now = new Date();

      // Store request in Firestore
      const docRef = await addDoc(collection(db, "adminRequests"), {
        name: name.trim(),
        otp,
        status: "pending",
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min TTL
      });
      setRequestId(docRef.id);

      // Send email to admin via EmailJS
      if (EMAILJS_SERVICE && EMAILJS_TEMPLATE && EMAILJS_KEY) {
        try {
          console.log("EmailJS config:", { service: EMAILJS_SERVICE, template: EMAILJS_TEMPLATE, key: EMAILJS_KEY ? "set" : "MISSING" });
          const result = await emailjs.send(
            EMAILJS_SERVICE,
            EMAILJS_TEMPLATE,
            {
              email: "wilfriedhouinlindjonon91@gmail.com",
              requester_name: name.trim(),
              otp_code: otp,
              time: now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
            },
            { publicKey: EMAILJS_KEY }
          );
          console.log("EmailJS success:", result);
          setEmailSent(true);
        } catch (emailErr: unknown) {
          const errMsg = emailErr instanceof Error ? emailErr.message : JSON.stringify(emailErr);
          console.error("EmailJS error detail:", errMsg, emailErr);
          // Continue even if email fails — OTP is in Firestore
        }
      }

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
      const { getDoc, updateDoc } = await import("firebase/firestore");
      const snap = await getDoc(doc(db, "adminRequests", requestId));
      if (!snap.exists()) {
        setError("Demande introuvable.");
        return;
      }

      const data = snap.data();

      // Check expiration
      const expiresAt = data.expiresAt?.toDate?.() || data.expiresAt;
      if (expiresAt && new Date() > new Date(expiresAt)) {
        setError("Code expire. Faites une nouvelle demande.");
        return;
      }

      // Check OTP or master password fallback
      const masterPassword = process.env.NEXT_PUBLIC_ADMIN_MASTER_CODE;
      const isValidOTP = data.otp === otpInput.trim();
      const isMasterCode = masterPassword && otpInput.trim() === masterPassword;

      if (isValidOTP || isMasterCode) {
        await updateDoc(doc(db, "adminRequests", requestId), {
          status: "approved",
        });
        localStorage.setItem("ylc_admin_auth", "true");
        localStorage.setItem("ylc_admin_name", data.name || "Admin");
        router.replace("/admin");
      } else {
        setError("Code incorrect. Verifiez aupres de l'administrateur.");
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
                Votre nom complet
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Prenom et nom"
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
              {loading ? "Envoi de la demande..." : "Demander l'acces"}
            </button>

            <p className="text-center text-white/20 text-xs">
              Un code vous sera communique par l&apos;administrateur.
            </p>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6 text-center space-y-3">
              <span className="material-symbols-outlined text-amber-400 text-4xl block">
                {emailSent ? "mark_email_read" : "hourglass_top"}
              </span>
              <p className="text-amber-300 font-medium">
                Demande envoyee !
              </p>
              <p className="text-white/40 text-sm">
                {emailSent
                  ? "L'administrateur a recu votre demande par email. Il va vous communiquer un code."
                  : "Contactez l'administrateur pour obtenir votre code d'acces."}
              </p>
              <p className="text-white/20 text-xs">
                Demande de : <strong className="text-white/40">{name}</strong>
              </p>
            </div>

            <div>
              <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-2 block">
                Code d&apos;acces (6 chiffres)
              </label>
              <input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                autoFocus
                inputMode="numeric"
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
              onClick={() => { setStep("request"); setRequestId(null); setOtpInput(""); setError(null); }}
              className="w-full text-center text-white/30 text-sm hover:text-white/50"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
