"use client";

import { useState } from "react";
import { sendSignInLinkToEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";

const ADMIN_EMAIL = "wilfriedhouinlindjonon91@gmail.com";

export default function AdminLoginPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSendLink() {
    setLoading(true);
    setError(null);

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/admin/auth/callback`,
        handleCodeInApp: true,
      };

      await sendSignInLinkToEmail(auth, ADMIN_EMAIL, actionCodeSettings);
      window.localStorage.setItem("emailForSignIn", ADMIN_EMAIL);
      setSent(true);
    } catch (err) {
      console.error("Magic link error:", err);
      setError("Erreur lors de l'envoi du lien. Verifiez la configuration Firebase Auth.");
    } finally {
      setLoading(false);
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

        {sent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center space-y-3">
            <span className="material-symbols-outlined text-emerald-400 text-4xl block">
              mark_email_read
            </span>
            <p className="text-emerald-300 font-medium">
              Lien magique envoye !
            </p>
            <p className="text-white/50 text-sm">
              Verifiez votre boite mail et cliquez sur le lien pour vous connecter.
            </p>
            <p className="text-white/30 text-xs font-mono">
              {ADMIN_EMAIL}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-5 space-y-3">
              <p className="text-white/70 text-sm">
                Un lien de connexion sera envoye a :
              </p>
              <p className="text-white font-mono text-sm bg-white/5 rounded-lg px-4 py-3">
                {ADMIN_EMAIL}
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSendLink}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-amber-500 text-black font-bold text-base hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien magique"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
