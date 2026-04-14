"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface TeamStat {
  teamId: string;
  teamName: string;
  score: number;
  completedWords: number;
  hintsUsed: number;
  totalAttempts: number;
  completedAt: number | null; // timestamp of last word completed
}

export default function AdminGameStatsPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("");
  const [teamStats, setTeamStats] = useState<TeamStat[]>([]);
  const [totalWordsInGame, setTotalWordsInGame] = useState(0);
  const [loading, setLoading] = useState(true);

  // Load event to get activeGameId
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGameId(data.activeGameId || data.lastGameId || null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Load game instance status
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameInstances", gameId), (snap) => {
      if (snap.exists()) {
        setGameStatus(snap.data().status || "");
      }
    });
    return unsub;
  }, [gameId]);

  // Load template to get total word count
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameTemplates", gameId), (snap) => {
      if (snap.exists()) {
        const phrases = snap.data().phrases || [];
        const total = phrases.reduce(
          (sum: number, p: { words?: unknown[] }) =>
            sum + (p.words?.length || 0),
          0
        );
        setTotalWordsInGame(total);
      }
    });
    return unsub;
  }, [gameId]);

  // Load team progress
  useEffect(() => {
    if (!gameId) return;

    async function loadProgress() {
      // Get leaderboard for team names
      const instanceSnap = await getDocs(collection(db, "gameInstances"));
      const instanceDoc = instanceSnap.docs.find((d) => d.id === gameId);
      const leaderboard: Array<{ teamId: string; teamName: string }> =
        instanceDoc?.data()?.leaderboard || [];
      const teamNameMap: Record<string, string> = {};
      leaderboard.forEach((e) => {
        teamNameMap[e.teamId] = e.teamName;
      });

      const progressSnap = await getDocs(
        collection(db, "gameProgress", gameId!, "teams")
      );

      const stats: TeamStat[] = progressSnap.docs.map((d) => {
        const data = d.data();
        const slots: Record<
          string,
          {
            attempts?: number;
            hintsUsed?: number;
            completedAt?: { toMillis?: () => number } | null;
            status?: string;
          }
        > = data.slots || {};

        let totalAttempts = 0;
        let hintsUsed = 0;
        let latestCompletion: number | null = null;

        Object.values(slots).forEach((slot) => {
          totalAttempts += slot.attempts || 0;
          hintsUsed += slot.hintsUsed || 0;
          if (slot.status === "completed" && slot.completedAt) {
            const ts =
              typeof slot.completedAt === "object" && slot.completedAt?.toMillis
                ? slot.completedAt.toMillis()
                : typeof slot.completedAt === "number"
                ? slot.completedAt
                : null;
            if (ts && (latestCompletion === null || ts > latestCompletion)) {
              latestCompletion = ts;
            }
          }
        });

        return {
          teamId: d.id,
          teamName: teamNameMap[d.id] || d.id,
          score: data.score || 0,
          completedWords: data.completedWords || 0,
          hintsUsed,
          totalAttempts,
          completedAt: latestCompletion,
        };
      });

      setTeamStats(stats);
    }

    loadProgress();

    // Also listen for real-time updates
    const unsub = onSnapshot(
      collection(db, "gameProgress", gameId!, "teams"),
      () => {
        loadProgress();
      }
    );
    return unsub;
  }, [gameId]);

  // Computed highlights
  const fastestTeam = teamStats
    .filter((t) => t.completedWords === totalWordsInGame && t.completedAt)
    .sort((a, b) => (a.completedAt || 0) - (b.completedAt || 0))[0] || null;

  const topScorer = [...teamStats].sort((a, b) => b.score - a.score)[0] || null;

  const fewestHints =
    teamStats.length > 0
      ? [...teamStats].sort((a, b) => a.hintsUsed - b.hintsUsed)[0]
      : null;

  const totalAttemptsAll = teamStats.reduce((s, t) => s + t.totalAttempts, 0);
  const totalWordsFound = teamStats.reduce((s, t) => s + t.completedWords, 0);
  const avgAttemptsPerWord =
    totalWordsFound > 0 ? (totalAttemptsAll / totalWordsFound).toFixed(1) : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-white/30">
        Chargement...
      </div>
    );
  }

  if (!gameId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Statistiques du jeu</h1>
        <div className="text-center py-16 text-white/30">
          Aucun jeu actif ou recent.
        </div>
      </div>
    );
  }

  const HIGHLIGHTS = [
    {
      label: "Equipe la plus rapide",
      value: fastestTeam?.teamName || "—",
      icon: "bolt",
      color: "bg-amber-500/10 text-amber-400",
    },
    {
      label: "Meilleur score",
      value: topScorer ? `${topScorer.teamName} (${topScorer.score} pts)` : "—",
      icon: "emoji_events",
      color: "bg-emerald-500/10 text-emerald-400",
    },
    {
      label: "Moins d'indices",
      value: fewestHints
        ? `${fewestHints.teamName} (${fewestHints.hintsUsed})`
        : "—",
      icon: "lightbulb",
      color: "bg-blue-500/10 text-blue-400",
    },
    {
      label: "Moy. tentatives/mot",
      value: avgAttemptsPerWord,
      icon: "calculate",
      color: "bg-purple-500/10 text-purple-400",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Statistiques du jeu</h1>
        <span
          className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            gameStatus === "active"
              ? "bg-emerald-500/10 text-emerald-400"
              : gameStatus === "ended"
              ? "bg-red-500/10 text-red-400"
              : "bg-amber-500/10 text-amber-400"
          }`}
        >
          {gameStatus === "active"
            ? "En cours"
            : gameStatus === "ended"
            ? "Termine"
            : gameStatus}
        </span>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.label}
            className="bg-white/5 rounded-xl p-5 border border-white/5"
          >
            <div
              className={`w-10 h-10 rounded-lg ${h.color} flex items-center justify-center mb-3`}
            >
              <span className="material-symbols-outlined text-lg">
                {h.icon}
              </span>
            </div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
              {h.label}
            </p>
            <p className="text-lg font-bold text-white mt-1 truncate">
              {h.value}
            </p>
          </div>
        ))}
      </div>

      {/* Per-team breakdown */}
      <h2 className="text-lg font-bold text-white/70 mb-4">
        Detail par equipe
      </h2>
      <div className="space-y-3">
        {teamStats
          .sort((a, b) => b.score - a.score)
          .map((team, i) => (
            <div
              key={team.teamId}
              className={`bg-white/5 border rounded-xl p-5 ${
                i === 0 ? "border-amber-500/20" : "border-white/5"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg w-8 text-center">
                    {i === 0
                      ? "\u{1F947}"
                      : i === 1
                      ? "\u{1F948}"
                      : i === 2
                      ? "\u{1F949}"
                      : `${i + 1}.`}
                  </span>
                  <p className="font-bold text-white">{team.teamName}</p>
                </div>
                <p
                  className={`text-xl font-bold font-mono ${
                    i === 0 ? "text-amber-400" : "text-white"
                  }`}
                >
                  {team.score}{" "}
                  <span className="text-xs text-white/20">pts</span>
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-white/30 text-xs">Mots trouves</p>
                  <p className="text-white font-bold">
                    {team.completedWords}
                    {totalWordsInGame > 0 && (
                      <span className="text-white/20 font-normal">
                        {" "}
                        / {totalWordsInGame}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-white/30 text-xs">Indices utilises</p>
                  <p className="text-white font-bold">{team.hintsUsed}</p>
                </div>
                <div>
                  <p className="text-white/30 text-xs">Tentatives totales</p>
                  <p className="text-white font-bold">{team.totalAttempts}</p>
                </div>
              </div>
            </div>
          ))}

        {teamStats.length === 0 && (
          <div className="text-center py-16 text-white/30">
            Aucune donnee de progression.
          </div>
        )}
      </div>
    </div>
  );
}
