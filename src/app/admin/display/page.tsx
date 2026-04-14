"use client";

import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_ID = "event-default";

interface TeamProgress {
  teamId: string;
  teamName: string;
  score: number;
  completedWords: number;
  rank: number;
}

const MEDAL = ["", "", ""];

export default function ProjectorDisplayPage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("waiting");
  const [leaderboard, setLeaderboard] = useState<TeamProgress[]>([]);
  const [totalWords, setTotalWords] = useState(0);
  const [celebration, setCelebration] = useState<string | null>(null);
  const prevLeaderboardRef = useRef<TeamProgress[]>([]);

  // Listen to event for activeGameId
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        setGameId(snap.data().activeGameId || null);
      }
    });
    return unsub;
  }, []);

  // Listen to game instance
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameInstances", gameId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGameStatus(data.status || "waiting");
        const newBoard: TeamProgress[] = (data.leaderboard || [])
          .slice()
          .sort((a: TeamProgress, b: TeamProgress) => b.score - a.score)
          .map((entry: TeamProgress, i: number) => ({ ...entry, rank: i + 1 }));
        setLeaderboard(newBoard);
      }
    });
    return unsub;
  }, [gameId]);

  // Listen to game template for total words
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameTemplates", gameId), (snap) => {
      if (snap.exists()) {
        const phrases = snap.data().phrases || [];
        const total = phrases.reduce(
          (sum: number, p: { words?: unknown[] }) => sum + (p.words?.length || 0),
          0
        );
        setTotalWords(total);
      }
    });
    return unsub;
  }, [gameId]);

  // Detect team completion for celebration
  useEffect(() => {
    if (totalWords === 0 || leaderboard.length === 0) return;
    const prev = prevLeaderboardRef.current;

    for (const entry of leaderboard) {
      const prevEntry = prev.find((p) => p.teamId === entry.teamId);
      const wasComplete = prevEntry ? prevEntry.completedWords >= totalWords : false;
      const isComplete = entry.completedWords >= totalWords;

      if (isComplete && !wasComplete && prev.length > 0) {
        setCelebration(entry.teamName);
        const timer = setTimeout(() => setCelebration(null), 6000);
        prevLeaderboardRef.current = leaderboard;
        return () => clearTimeout(timer);
      }
    }

    prevLeaderboardRef.current = leaderboard;
  }, [leaderboard, totalWords]);

  // Status badge
  const statusLabel =
    gameStatus === "active"
      ? "EN COURS"
      : gameStatus === "paused"
      ? "EN PAUSE"
      : gameStatus === "ended"
      ? "TERMINE"
      : "EN ATTENTE";

  const statusColor =
    gameStatus === "active"
      ? "bg-emerald-500"
      : gameStatus === "paused"
      ? "bg-amber-500"
      : gameStatus === "ended"
      ? "bg-red-500"
      : "bg-white/20";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-[#0a0a1a] via-[#10102a] to-[#1a0a2e] text-white overflow-hidden relative">
      {/* Subtle animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-400/20"
            initial={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              scale: Math.random() * 2 + 0.5,
            }}
            animate={{
              y: [null, `-20vh`],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 8 + 6,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 px-12 flex items-center justify-between">
        <div>
          <motion.h1
            className="text-5xl font-black tracking-tight"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Chasse au Tresor
            </span>
          </motion.h1>
          <motion.p
            className="text-lg text-white/30 font-medium mt-1 tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Youth Leaders Conference
          </motion.p>
        </div>

        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          {/* Status badge */}
          <div className="flex items-center gap-3">
            <span
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest ${statusColor}/20`}
            >
              {gameStatus === "active" && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
              )}
              {gameStatus !== "active" && (
                <span className={`w-3 h-3 rounded-full ${statusColor}`} />
              )}
              <span
                className={
                  gameStatus === "active"
                    ? "text-emerald-400"
                    : gameStatus === "paused"
                    ? "text-amber-400"
                    : gameStatus === "ended"
                    ? "text-red-400"
                    : "text-white/40"
                }
              >
                {statusLabel}
              </span>
            </span>
          </div>
        </motion.div>
      </header>

      {/* Divider line */}
      <div className="mx-12 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      {/* Main content */}
      <main className="relative z-10 px-12 py-8 flex-1">
        {!gameId ? (
          <motion.div
            className="flex flex-col items-center justify-center py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-6xl mb-6 opacity-30">&#127942;</div>
            <p className="text-2xl text-white/20 font-medium">
              En attente du lancement du jeu...
            </p>
          </motion.div>
        ) : leaderboard.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 rounded-full border-3 border-amber-400 border-t-transparent animate-spin mb-6" />
            <p className="text-2xl text-white/20 font-medium">
              Chargement des equipes...
            </p>
          </motion.div>
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center px-6 py-3 mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/20">
              <span className="w-16 text-center">#</span>
              <span className="flex-1">Equipe</span>
              <span className="w-48 text-center">Progression</span>
              <span className="w-32 text-right">Score</span>
            </div>

            {/* Leaderboard rows */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {leaderboard.map((entry, i) => {
                  const isFirst = i === 0;
                  const progress =
                    totalWords > 0
                      ? Math.round((entry.completedWords / totalWords) * 100)
                      : 0;
                  const isComplete = totalWords > 0 && entry.completedWords >= totalWords;

                  return (
                    <motion.div
                      key={entry.teamId}
                      layout
                      initial={{ opacity: 0, x: -40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{
                        layout: { type: "spring", stiffness: 400, damping: 30 },
                        duration: 0.4,
                        delay: i * 0.05,
                      }}
                      className={`relative flex items-center px-6 py-5 rounded-2xl border transition-colors ${
                        isFirst
                          ? "bg-amber-500/10 border-amber-500/30"
                          : "bg-white/[0.03] border-white/[0.06]"
                      }`}
                    >
                      {/* First place glow */}
                      {isFirst && (
                        <motion.div
                          className="absolute inset-0 rounded-2xl bg-amber-400/5"
                          animate={{ opacity: [0.3, 0.8, 0.3] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      )}

                      {/* Rank */}
                      <div className="w-16 text-center relative z-10">
                        {i < 3 ? (
                          <span className="text-4xl">{MEDAL[i]}</span>
                        ) : (
                          <span className="text-2xl font-black text-white/20">
                            {i + 1}
                          </span>
                        )}
                      </div>

                      {/* Team name */}
                      <div className="flex-1 relative z-10">
                        <p
                          className={`text-2xl font-bold ${
                            isFirst ? "text-amber-300" : "text-white"
                          }`}
                        >
                          {entry.teamName}
                        </p>
                        <p className="text-sm text-white/30 mt-0.5">
                          {entry.completedWords} / {totalWords} mots trouves
                          {isComplete && (
                            <span className="ml-2 text-emerald-400 font-bold">
                              COMPLET
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="w-48 relative z-10 px-4">
                        <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${
                              isComplete
                                ? "bg-gradient-to-r from-emerald-400 to-emerald-300"
                                : isFirst
                                ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                : "bg-gradient-to-r from-blue-500 to-cyan-400"
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                          />
                        </div>
                        <p className="text-xs text-white/20 text-center mt-1 font-mono">
                          {progress}%
                        </p>
                      </div>

                      {/* Score */}
                      <div className="w-32 text-right relative z-10">
                        <motion.p
                          className={`text-4xl font-black font-mono tabular-nums ${
                            isFirst ? "text-amber-400" : "text-white"
                          }`}
                          key={entry.score}
                          initial={{ scale: 1.3, color: "#fbbf24" }}
                          animate={{
                            scale: 1,
                            color: isFirst ? "#fbbf24" : "#ffffff",
                          }}
                          transition={{ duration: 0.4 }}
                        >
                          {entry.score}
                        </motion.p>
                        <p className="text-xs text-white/20 uppercase tracking-widest">
                          pts
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      {/* Celebration overlay */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Confetti-like particles */}
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    background: ["#fbbf24", "#f59e0b", "#10b981", "#3b82f6", "#ec4899"][
                      i % 5
                    ],
                    left: "50%",
                    top: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: (Math.random() - 0.5) * 600,
                    y: (Math.random() - 0.5) * 600,
                    opacity: 0,
                    scale: Math.random() * 2,
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut",
                  }}
                />
              ))}

              <motion.div
                className="text-8xl mb-6"
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                &#127942;
              </motion.div>
              <motion.h2
                className="text-6xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 bg-clip-text text-transparent mb-4"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {celebration}
              </motion.h2>
              <motion.p
                className="text-3xl text-white/60 font-medium"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                a termine la chasse !
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer branding */}
      <footer className="relative z-10 pb-6 text-center">
        <p className="text-xs text-white/10 uppercase tracking-[0.3em] font-medium">
          Youth Leaders Conference 2026
        </p>
      </footer>
    </div>
  );
}
