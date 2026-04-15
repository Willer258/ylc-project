"use client";

import { useState, type FormEvent } from "react";
import { useAuthContext } from "@/components/auth-provider";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const DEFAULT_EVENT_ID = "event-default";

export function Onboarding() {
  const { uuid, setUserName } = useAuthContext();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    try {
      // Persist member in Firestore
      await setDoc(
        doc(db, "events", DEFAULT_EVENT_ID, "members", uuid),
        {
          name: trimmed,
          deviceUUID: uuid,
          joinedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setUserName(trimmed);
    } catch (err) {
      console.error("Onboarding error:", err);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Title */}
        <div className="text-center space-y-3">
          <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight">
            Young Christian Lifestyle
          </h1>
          <p className="text-on-surface-variant text-lg">
            Bienvenue ! Entre ton prenom pour rejoindre l&apos;aventure.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton prenom"
              maxLength={30}
              autoFocus
              className="w-full px-5 py-4 rounded-xl bg-surface-container-highest text-on-surface font-body text-lg placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-4 rounded-full gradient-cta text-on-primary font-bold text-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Chargement..." : "Rejoindre"}
          </button>
        </form>
      </div>
    </div>
  );
}
