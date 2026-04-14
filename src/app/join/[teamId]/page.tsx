"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const EVENT_ID = "event-default";

export default function JoinTeamPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState<string | null>(null);
  const [teamFull, setTeamFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Check if already logged in
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existingTeam = localStorage.getItem("ylc_team_id");
    if (existingTeam) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  // Load team info
  useEffect(() => {
    if (!ready || !teamId) return;

    async function loadTeam() {
      try {
        const { doc, getDoc, getDocs, collection } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        const teamDoc = await getDoc(doc(db, "events", EVENT_ID, "teams", teamId));
        if (teamDoc.exists()) {
          const data = teamDoc.data();
          setTeamName(data.name);
          const membersSnap = await getDocs(
            collection(db, "events", EVENT_ID, "teams", teamId, "members")
          );
          if (membersSnap.size >= (data.maxSize || 5)) {
            setTeamFull(true);
          }
        } else {
          setError("Cette equipe n'existe pas.");
        }
      } catch (err) {
        console.error("Load team error:", err);
        setError("Impossible de charger l'equipe.");
      } finally {
        setLoading(false);
      }
    }

    loadTeam();
  }, [ready, teamId]);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || joining) return;

    setJoining(true);
    setError(null);

    try {
      const { doc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const { getDeviceUUID, setUserName, setTeamId, setEventId } = await import("@/lib/auth");

      const uuid = getDeviceUUID();

      // Save member in event
      await setDoc(
        doc(db, "events", EVENT_ID, "members", uuid),
        { name: trimmedName, deviceUUID: uuid, joinedAt: serverTimestamp() },
        { merge: true }
      );

      // Join team
      await setDoc(
        doc(db, "events", EVENT_ID, "teams", teamId, "members", uuid),
        { name: trimmedName, deviceUUID: uuid, joinedAt: serverTimestamp(), captainVote: null }
      );

      // Store locally
      setUserName(trimmedName);
      setTeamId(teamId);
      setEventId(EVENT_ID);

      // Redirect
      router.replace("/");
    } catch (err) {
      console.error("Join error:", err);
      setError("Erreur lors de l'inscription. Reessaie.");
      setJoining(false);
    }
  }

  if (!ready) return null;

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error && !teamName) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <span className="material-symbols-outlined text-5xl text-error/40 block">error</span>
          <p className="text-on-surface font-bold text-lg">{error}</p>
        </div>
      </div>
    );
  }

  if (teamFull) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background">
        <div className="text-center space-y-4 max-w-sm">
          <span className="material-symbols-outlined text-5xl text-error/40 block">group_off</span>
          <h1 className="font-headline text-2xl font-extrabold text-on-surface">Equipe complete</h1>
          <p className="text-on-surface-variant">
            L&apos;equipe <strong>{teamName}</strong> est deja au complet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background">
      <motion.div
        className="w-full max-w-sm space-y-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center space-y-3">
          <motion.div
            className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full text-sm font-bold"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span className="material-symbols-outlined text-sm">groups</span>
            {teamName || "Equipe"}
          </motion.div>
          <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Rejoins l&apos;aventure
          </h1>
          <p className="text-on-surface-variant text-base">
            Entre ton prenom pour rejoindre
            {teamName && <strong> {teamName}</strong>}.
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ton prenom"
            maxLength={30}
            autoFocus
            className="w-full px-5 py-4 rounded-xl bg-surface-container-highest text-on-surface font-body text-lg placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-colors"
          />

          <motion.button
            type="submit"
            disabled={!name.trim() || joining}
            className="w-full py-4 rounded-full gradient-cta text-on-primary font-bold text-lg disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {joining ? "Inscription..." : "Rejoindre"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
