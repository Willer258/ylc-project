"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";
import { useSearchParams } from "next/navigation";
import { QrScanner } from "@/components/qr-scanner";
import { HINT_LABELS, HINT_ICONS, type Hint } from "@/lib/game-types";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { playWordFound, playVictory } from "@/lib/sounds";
import { useToast } from "@/components/toast";

const EVENT_ID = "event-default";

interface WordState {
  index: number;
  phraseIndex: number;
  letterCount: number;
  status: "hidden" | "completed";
  value: string;
  attempts: number;
  hints: Hint[];
  hintsUnlocked: Hint[];
  pointsEarned?: number;
}

interface PhraseState {
  text: string;
  reference: string;
  words: WordState[];
}

interface LeaderboardEntry {
  teamId: string;
  teamName: string;
  score: number;
  completedWords: number;
  rank: number;
}

export default function JeuPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <JeuPage />
    </Suspense>
  );
}

function JeuPage() {
  const { uuid, teamId, userName } = useAuthContext();
  const searchParams = useSearchParams();
  const [gameId, setGameId] = useState<string | null>(null);
  const [highlightApplied, setHighlightApplied] = useState(false);
  const [gameStatus, setGameStatus] = useState<string>("nogame");
  const [phrases, setPhrases] = useState<PhraseState[]>([]);
  const [score, setScore] = useState(0);
  const [completedWords, setCompletedWords] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [selectedWord, setSelectedWord] = useState<WordState | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showHint, setShowHint] = useState<Hint | null>(null);
  const [phraseComplete, setPhraseComplete] = useState(false);
  const confettiFired = useRef(false);
  const [completedReference, setCompletedReference] = useState("");
  const { showToast, ToastContainer } = useToast();

  const [verseHintActive, setVerseHintActive] = useState(false);

  // Load active game + verse hint flag
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        const id = snap.data().activeGameId;
        setGameId(id || null);
        if (!id) setGameStatus("nogame");
        setVerseHintActive(snap.data().verseHintActive || false);
      }
    });
    return unsub;
  }, []);

  const [myPhraseIndex, setMyPhraseIndex] = useState<number | null>(null);

  // Load game instance (status + leaderboard + team phrase assignment)
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameInstances", gameId), (snap) => {
      if (snap.exists()) {
        setGameStatus(snap.data().status || "waiting");
        setLeaderboard(snap.data().leaderboard || []);
        // Get this team's assigned phrase index
        const teamPhrases = snap.data().teamPhrases || {};
        if (teamId && teamPhrases[teamId] != null) {
          setMyPhraseIndex(teamPhrases[teamId]);
        }
      }
    });
    return unsub;
  }, [gameId, teamId]);

  // Load template — only the phrase assigned to this team
  useEffect(() => {
    if (!gameId || myPhraseIndex === null) return;
    const unsub = onSnapshot(doc(db, "gameTemplates", gameId), (snap) => {
      if (snap.exists()) {
        const rawPhrases = snap.data().phrases || [];
        const pi = myPhraseIndex;
        const p = rawPhrases[pi];
        if (!p) return;

        setPhrases([{
          text: p.text as string,
          reference: p.reference as string || "",
          words: ((p.words as Array<Record<string, unknown>>) || []).map((w, wi: number) => ({
            index: wi,
            phraseIndex: pi,
            letterCount: (w.letterCount as number) || (w.value as string)?.length || 0,
            status: "hidden" as const,
            value: "",
            attempts: 0,
            hints: ((w.hints as Hint[]) || []),
            hintsUnlocked: [],
          })),
        }]);
      }
    });
    return unsub;
  }, [gameId, myPhraseIndex]);

  // Store raw progress data to re-apply when phrases load
  const [rawProgress, setRawProgress] = useState<Record<string, unknown> | null>(null);

  // Load team progress (real-time sync)
  const prevCompletedRef = useRef(0);
  useEffect(() => {
    if (!gameId || !teamId) return;
    const unsub = onSnapshot(
      doc(db, "gameProgress", gameId, "teams", teamId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const newCompleted = data.completedWords || 0;
        // Play sound when a teammate finds a word (not on initial load)
        if (prevCompletedRef.current > 0 && newCompleted > prevCompletedRef.current) {
          playWordFound();
          showToast("Un coequipier a trouve un mot !", "success");
        }
        prevCompletedRef.current = newCompleted;
        setScore(data.score || 0);
        setCompletedWords(newCompleted);
        setRawProgress(data);
      }
    );
    return unsub;
  }, [gameId, teamId, showToast]);

  // Apply progress to phrases when both are loaded
  useEffect(() => {
    if (!rawProgress || phrases.length === 0) return;
    // Only apply if phrases have hints loaded (not empty shell)
    if (phrases[0]?.words?.[0]?.hints?.length === undefined) return;

    const data = rawProgress;
    setPhrases((prev) => {
      let allComplete = true;
      const updated = prev.map((phrase) => ({
        ...phrase,
        words: phrase.words.map((word, wi) => {
          const key = `word_${word.phraseIndex}_${wi}`;
          const slot = (data.slots as Record<string, Record<string, unknown>>)?.[key];
          if (slot?.status === "completed") {
            return {
              ...word,
              status: "completed" as const,
              value: (slot.completedWord as string) || "",
              attempts: (slot.attempts as number) || 0,
              pointsEarned: slot.pointsEarned as number,
              hintsUnlocked: ((slot.hintsUnlocked as string[]) || []).map((type: string) =>
                word.hints.find((h) => h.type === type)
              ).filter(Boolean) as Hint[],
            };
          }
          allComplete = false;
          return {
            ...word,
            attempts: (slot?.attempts as number) || 0,
            hintsUnlocked: ((slot?.hintsUnlocked as string[]) || []).map((type: string) =>
              word.hints.find((h) => h.type === type)
            ).filter(Boolean) as Hint[],
          };
        }),
      }));

      // Check phrase completion
      if (allComplete && prev.length > 0 && prev[0].words.length > 0) {
        const ref = prev[0]?.reference || "";
        setCompletedReference(ref);
        setPhraseComplete(true);
      }

      return updated;
    });
  }, [rawProgress, phrases.length]);

  // Auto-select word from QR redirect (highlight param)
  useEffect(() => {
    if (highlightApplied || phrases.length === 0) return;
    const highlight = searchParams.get("highlight");
    if (!highlight) return;

    const [pi, wi] = highlight.split("_").map(Number);
    if (isNaN(pi) || isNaN(wi)) return;

    // Find the word in phrases
    for (const phrase of phrases) {
      const word = phrase.words.find((w) => w.phraseIndex === pi && w.index === wi);
      if (word && word.status !== "completed") {
        setSelectedWord(word);
        setHighlightApplied(true);
        break;
      }
    }
  }, [phrases, searchParams, highlightApplied]);

  // Submit guess
  const handleGuess = useCallback(async () => {
    if (!selectedWord || !guess.trim() || submitting || !gameId || !teamId) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/game/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          teamId,
          phraseIndex: selectedWord.phraseIndex,
          wordIndex: selectedWord.index,
          guess: guess.trim(),
          userId: uuid,
        }),
      });
      const data = await res.json();

      if (data.correct) {
        playWordFound();
        setFeedback("correct");
        setTimeout(() => {
          setSelectedWord(null);
          setGuess("");
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback("wrong");
        setGuess("");
        setTimeout(() => setFeedback(null), 600);
      }
    } catch {
      setGuess("");
    } finally {
      setSubmitting(false);
    }
  }, [selectedWord, guess, submitting, gameId, teamId, uuid]);

  // QR scan handler
  const handleScan = useCallback((data: string) => {
    setScanning(false);
    const match = data.match(/\/qr\/(.+)$/);
    window.location.href = match ? `/qr/${match[1]}` : `/qr/${data}`;
  }, []);

  const totalWords = phrases.reduce((s, p) => s + p.words.length, 0);
  const myRank = leaderboard.find((e) => e.teamId === teamId)?.rank;

  // Confetti + victory sound on phrase completion
  useEffect(() => {
    if (phraseComplete && !confettiFired.current) {
      confettiFired.current = true;
      playVictory();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.5 } });
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.5 } });
      }, 600);
      setTimeout(() => {
        confetti({ particleCount: 150, spread: 120, origin: { y: 0.4 }, startVelocity: 45 });
      }, 1200);
    }
  }, [phraseComplete]);

  // === SCREENS ===

  // No game
  if (gameStatus === "nogame") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <ToastContainer />
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.span
            className="material-symbols-outlined text-6xl text-primary/20 block"
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            sports_esports
          </motion.span>
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            La chasse n&apos;a pas encore commence
          </h1>
          <p className="text-on-surface-variant text-sm">
            Restez connectes — l&apos;animateur va bientot lancer le jeu !
          </p>
        </motion.div>
      </div>
    );
  }

  // Paused
  if (gameStatus === "paused") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6">
        <ToastContainer />
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.span
            className="material-symbols-outlined text-6xl text-primary/30 block"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            pause_circle
          </motion.span>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Jeu en pause</h1>
          <p className="text-on-surface-variant text-sm">L&apos;animateur a mis le jeu en pause.</p>
        </motion.div>
      </div>
    );
  }

  // Phrase complete — VICTORY (confetti effect)

  if (phraseComplete) {
    const fullText = phrases[0]?.words.map((w) => w.value).join(" ") || "";
    const rank = leaderboard.find((e) => e.teamId === teamId)?.rank;
    const isFirst = rank === 1;

    return (
      <motion.div
        className="min-h-dvh flex items-center justify-center px-6 bg-gradient-to-b from-background to-primary/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <ToastContainer />
        <div className="text-center max-w-sm space-y-8">
          {/* Trophy / celebration */}
          <motion.div
            className="text-7xl"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {isFirst ? "🏆" : "🎉"}
          </motion.div>

          <motion.h1
            className="font-headline text-3xl font-extrabold text-primary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {isFirst ? "Champions !" : "Bravo !"}
          </motion.h1>

          {/* Victory message */}
          <motion.p
            className="text-on-surface-variant text-lg leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {isFirst
              ? "Vous etes la premiere equipe a terminer la chasse au tresor ! Allez recuperer votre lot aupres de l'animateur !"
              : `Vous avez termine en ${rank}e position ! Felicitations a toute l'equipe !`}
          </motion.p>

          {/* Phrase reveal */}
          <motion.div
            className="bg-surface-container-lowest rounded-2xl p-6 editorial-shadow"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1 }}
          >
            <p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest mb-3">
              Le verset etait
            </p>
            <p className="font-headline text-xl font-bold text-on-surface leading-relaxed">
              &ldquo;{fullText}&rdquo;
            </p>
            <motion.p
              className="text-primary font-bold mt-4 text-lg"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2, duration: 0.8 }}
            >
              — {completedReference}
            </motion.p>
          </motion.div>

          {/* Prize CTA for winners */}
          {isFirst && (
            <motion.div
              className="bg-amber-500/10 border border-amber-500/20 rounded-2xl px-6 py-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5 }}
            >
              <span className="material-symbols-outlined text-amber-500 text-3xl block mb-2">
                redeem
              </span>
              <p className="text-amber-700 font-bold text-sm">
                Presentez cet ecran a l&apos;animateur pour recuperer votre recompense !
              </p>
            </motion.div>
          )}

          <motion.button
            onClick={() => setShowLeaderboard(true)}
            className="gradient-cta text-on-primary px-8 py-3 rounded-full font-bold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            whileTap={{ scale: 0.95 }}
          >
            Voir le classement
          </motion.button>
        </div>

        {/* Leaderboard modal */}
        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLeaderboard(false)}
            >
              <div className="absolute inset-0 bg-on-surface/70 backdrop-blur-sm" />
              <motion.div
                className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 editorial-shadow"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="font-headline text-xl font-bold text-center mb-6">Classement Final</h2>
                {leaderboard.sort((a, b) => b.score - a.score).map((e, i) => (
                  <motion.div
                    key={e.teamId}
                    className={`flex items-center justify-between py-3 ${
                      e.teamId === teamId ? "text-primary" : "text-on-surface-variant"
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <span className="text-lg font-bold">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}{" "}
                      {e.teamName}{e.teamId === teamId ? " (vous)" : ""}
                    </span>
                    <span className="font-mono font-bold text-lg">{e.score}</span>
                  </motion.div>
                ))}
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="w-full mt-6 py-3 rounded-full bg-surface-container text-on-surface-variant font-bold"
                >
                  Fermer
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // === MAIN GAME SCREEN ===
  return (
    <motion.div
      className="pt-4 pb-36 max-w-lg mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <ToastContainer />

      {/* Header */}
      <motion.div
        className="px-5 mb-5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-xl font-extrabold text-primary">
              Chasse au Tresor
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {completedWords}/{totalWords} mots trouves
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Score badge */}
            <motion.div
              className="bg-primary/10 px-3 py-1.5 rounded-xl text-center"
              key={score}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
            >
              <p className="text-[10px] text-primary/50 font-bold">SCORE</p>
              <p className="font-headline font-bold text-primary text-base leading-none">{score}</p>
            </motion.div>
            {/* Rank */}
            {myRank && (
              <div className="bg-surface-container px-2.5 py-1.5 rounded-xl text-center">
                <p className="text-[10px] text-on-surface-variant/50 font-bold">RANG</p>
                <p className="font-bold text-on-surface text-base leading-none">
                  {myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : `${myRank}e`}
                </p>
              </div>
            )}
            {/* Leaderboard toggle */}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-lg">
                leaderboard
              </span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-cta rounded-full"
            animate={{ width: totalWords > 0 ? `${(completedWords / totalWords) * 100}%` : "0%" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Leaderboard dropdown */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            className="mx-5 mb-4 bg-surface-container-lowest rounded-2xl p-4 editorial-shadow"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-3">
              Classement
            </p>
            {leaderboard.sort((a, b) => b.score - a.score).map((e, i) => (
              <div
                key={e.teamId}
                className={`flex items-center justify-between py-2 ${
                  e.teamId === teamId ? "text-primary font-bold" : "text-on-surface-variant"
                }`}
              >
                <span className="text-sm">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}{" "}
                  {e.teamName}{e.teamId === teamId ? " (vous)" : ""}
                </span>
                <span className="text-sm font-mono">{e.score} pts</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phrases */}
      <div className="px-5 space-y-6">
        {phrases.map((phrase, pi) => (
          <motion.div
            key={pi}
            className="bg-surface-container-lowest rounded-2xl p-5 editorial-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: pi * 0.15 }}
          >
            {/* Reference indicator — reveals verse when timeline triggers it */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary/30 text-lg">auto_stories</span>
                <span className="text-xs text-on-surface-variant/40 font-bold uppercase tracking-widest">
                  Verset mystere
                </span>
              </div>
              {verseHintActive && phrase.reference && (
                <motion.span
                  className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2.5 py-1 rounded-full"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {phrase.reference}
                </motion.span>
              )}
            </div>

            {/* Phrase as inline sentence with clickable word blocks */}
            <div className="flex flex-wrap items-end gap-x-3 gap-y-4">
              {phrase.words.map((word, wi) => {
                const isCompleted = word.status === "completed";
                const isSelected = selectedWord?.phraseIndex === word.phraseIndex && selectedWord?.index === wi;
                const hasHints = word.hintsUnlocked.length > 0;

                return (
                  <motion.button
                    key={wi}
                    layout
                    onClick={() => {
                      if (!isCompleted) {
                        setSelectedWord(word);
                        setGuess("");
                        setFeedback(null);
                      }
                    }}
                    disabled={isCompleted}
                    className={`relative flex flex-col items-center transition-all ${
                      isCompleted
                        ? ""
                        : isSelected
                        ? "scale-105"
                        : "hover:scale-105"
                    }`}
                    whileTap={!isCompleted ? { scale: 0.95 } : {}}
                  >
                    {/* Hint indicator above */}
                    {hasHints && !isCompleted && (
                      <motion.span
                        className="text-[10px] mb-1"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                      >
                        💡
                      </motion.span>
                    )}

                    {isCompleted ? (
                      <motion.span
                        className="font-headline font-bold text-secondary text-lg"
                        initial={{ opacity: 0, rotateX: 90 }}
                        animate={{ opacity: 1, rotateX: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {word.value.toUpperCase()}
                      </motion.span>
                    ) : (
                      <span className={`flex gap-[2px] px-1 py-1 rounded-lg transition-colors ${
                        isSelected
                          ? "bg-primary/10 ring-2 ring-primary/30"
                          : "bg-surface-container-highest/50"
                      }`}>
                        {Array.from({ length: word.letterCount }).map((_, li) => (
                          <motion.span
                            key={li}
                            className={`w-4 h-5 rounded-sm flex items-center justify-center text-[10px] font-mono font-bold ${
                              isSelected
                                ? "bg-primary/20 text-primary"
                                : "bg-surface-container text-on-surface-variant/25"
                            }`}
                            animate={isSelected ? { y: [0, -2, 0] } : {}}
                            transition={{ delay: li * 0.03, duration: 0.3 }}
                          >
                            _
                          </motion.span>
                        ))}
                      </span>
                    )}

                    {/* Points earned */}
                    {isCompleted && word.pointsEarned && (
                      <motion.span
                        className="text-[9px] text-secondary font-bold mt-0.5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        +{word.pointsEarned}
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Hint display area — shows under the phrase for selected word */}
            <AnimatePresence>
              {selectedWord && phrases[0]?.words.some(
                (w) => w.phraseIndex === selectedWord.phraseIndex && w.index === selectedWord.index
              ) && selectedWord.hintsUnlocked.length > 0 && (
                <motion.div
                  className="mt-4 space-y-2 border-t border-outline-variant/10 pt-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <p className="text-[10px] text-amber-500/60 font-bold uppercase tracking-widest">
                    Indices pour le mot {selectedWord.index + 1} ({selectedWord.letterCount} lettres)
                  </p>
                  {selectedWord.hintsUnlocked.map((hint, hi) => (
                    <motion.div
                      key={hi}
                      className="bg-amber-500/5 rounded-xl px-4 py-3 flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: hi * 0.1 }}
                    >
                      <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5 shrink-0">
                        {HINT_ICONS[hint.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-amber-500/50 font-bold uppercase tracking-widest block mb-1">
                          {HINT_LABELS[hint.type]}
                        </span>
                        {hint.type === "anagram" && (
                          <p className="font-mono font-bold text-base text-on-surface tracking-[0.3em]">
                            {hint.content.scrambled}
                          </p>
                        )}
                        {hint.type === "phrase" && (
                          <p className="text-sm text-on-surface-variant italic leading-relaxed">
                            &ldquo;{hint.content.text}&rdquo;
                          </p>
                        )}
                        {hint.type === "emoji" && hint.content.emojis && (
                          <p className="text-2xl">{hint.content.emojis.join("  ")}</p>
                        )}
                        {hint.type === "4images" && (
                          <button
                            onClick={() => setShowHint(hint)}
                            className="text-sm text-amber-500 font-bold underline"
                          >
                            Voir les 4 images
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Instruction banner (no word selected) */}
      <AnimatePresence>
        {!selectedWord && gameStatus === "active" && (
          <motion.div
            className="fixed bottom-24 left-4 right-4 z-20"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="bg-surface-container-lowest/95 backdrop-blur-lg rounded-2xl px-5 py-4 editorial-shadow text-center">
              <p className="text-sm text-on-surface-variant">
                <span className="font-bold text-primary">Touchez un mot</span> pour le deviner, ou{" "}
                <span className="font-bold text-primary">scannez un QR</span> pour un indice
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guess input (word selected) */}
      <AnimatePresence>
        {selectedWord && selectedWord.status !== "completed" && (
          <motion.div
            className="fixed bottom-24 left-3 right-3 z-30"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <div
              className={`bg-surface-container-lowest rounded-2xl p-4 editorial-shadow border-2 transition-colors ${
                feedback === "correct"
                  ? "border-secondary"
                  : feedback === "wrong"
                  ? "border-error"
                  : "border-transparent"
              }`}
            >
              {/* Word info */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-on-surface-variant/50 uppercase">
                    {selectedWord.letterCount} lettres
                  </span>
                  {selectedWord.attempts > 0 && (
                    <span className="text-xs text-on-surface-variant/30">
                      {selectedWord.attempts} essai{selectedWord.attempts > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { setSelectedWord(null); setGuess(""); }}
                  className="text-on-surface-variant/30 hover:text-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Hints in bottom sheet */}
              {selectedWord.hintsUnlocked.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {selectedWord.hintsUnlocked.map((hint, hi) => (
                    <div key={hi} className="bg-amber-500/5 rounded-lg px-3 py-2 flex items-start gap-2">
                      <span className="material-symbols-outlined text-amber-500 text-sm mt-0.5 shrink-0">
                        {HINT_ICONS[hint.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] text-amber-500/50 font-bold uppercase tracking-widest">
                          {HINT_LABELS[hint.type]}
                        </span>
                        {hint.type === "anagram" && (
                          <p className="font-mono font-bold text-sm text-on-surface tracking-widest">
                            {hint.content.scrambled}
                          </p>
                        )}
                        {hint.type === "phrase" && (
                          <p className="text-xs text-on-surface-variant italic">
                            &ldquo;{hint.content.text}&rdquo;
                          </p>
                        )}
                        {hint.type === "emoji" && hint.content.emojis && (
                          <p className="text-base">{hint.content.emojis.join(" ")}</p>
                        )}
                        {hint.type === "4images" && (
                          <button
                            onClick={() => setShowHint(hint)}
                            className="text-xs text-amber-500 font-bold underline"
                          >
                            Voir les images
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input + button */}
              <motion.div
                className="flex gap-2"
                animate={feedback === "wrong" ? { x: [-6, 6, -4, 4, -2, 2, 0] } : {}}
                transition={{ duration: 0.35 }}
              >
                <input
                  type="text"
                  value={guess}
                  onChange={(e) => setGuess(e.target.value.toUpperCase())}
                  placeholder="VOTRE REPONSE..."
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="flex-1 bg-surface-container-highest rounded-xl px-4 py-3.5 text-on-surface font-headline font-bold text-base uppercase tracking-wider placeholder:text-on-surface-variant/25 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                />
                <motion.button
                  onClick={handleGuess}
                  disabled={!guess.trim() || submitting}
                  className="px-5 py-3.5 rounded-xl gradient-cta text-on-primary font-bold text-base disabled:opacity-40"
                  whileTap={{ scale: 0.93 }}
                >
                  {submitting ? "..." : "OK"}
                </motion.button>
              </motion.div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback === "correct" && (
                  <motion.p
                    className="text-center text-secondary font-bold text-sm mt-2"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Bravo ! ✨
                  </motion.p>
                )}
                {feedback === "wrong" && (
                  <motion.p
                    className="text-center text-error/70 text-xs mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Pas tout a fait... essaie encore !
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint modal */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowHint(null)}
          >
            <div className="absolute inset-0 bg-on-surface/70 backdrop-blur-sm" />
            <motion.div
              className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-3xl overflow-hidden editorial-shadow"
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hint header */}
              <div className="bg-primary/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">{HINT_ICONS[showHint.type]}</span>
                  <span className="font-bold text-on-surface">{HINT_LABELS[showHint.type]}</span>
                </div>
                <button onClick={() => setShowHint(null)} className="text-on-surface-variant/40">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Hint content */}
              <div className="p-5">
                {showHint.type === "4images" && showHint.content.images && (
                  <div className="grid grid-cols-2 gap-2">
                    {showHint.content.images.map((url, i) => (
                      <motion.div
                        key={i}
                        className="aspect-square rounded-xl overflow-hidden bg-surface-container"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.15 }}
                      >
                        {url ? (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20">
                            <span className="material-symbols-outlined text-3xl">image</span>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}

                {showHint.type === "anagram" && (
                  <div className="flex flex-wrap justify-center gap-2 py-6">
                    {(showHint.content.scrambled || "").split("").map((l, i) => (
                      <motion.span
                        key={i}
                        className="w-12 h-12 rounded-xl bg-primary/10 text-primary font-mono font-bold text-xl flex items-center justify-center"
                        initial={{ opacity: 0, rotateZ: 20 }}
                        animate={{ opacity: 1, rotateZ: [-5, 5, 0][i % 3] }}
                        transition={{ delay: i * 0.08, type: "spring" }}
                      >
                        {l}
                      </motion.span>
                    ))}
                  </div>
                )}

                {showHint.type === "phrase" && (
                  <div className="py-6 text-center">
                    <span className="material-symbols-outlined text-primary/20 text-3xl block mb-3">
                      format_quote
                    </span>
                    <p className="text-on-surface italic text-lg leading-relaxed">
                      &ldquo;{showHint.content.text}&rdquo;
                    </p>
                  </div>
                )}

                {showHint.type === "emoji" && showHint.content.emojis && (
                  <div className="flex justify-center gap-4 py-8">
                    {showHint.content.emojis.map((e, i) => (
                      <motion.span
                        key={i}
                        className="text-5xl"
                        initial={{ opacity: 0, scale: 0, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.35, type: "spring", stiffness: 300 }}
                      >
                        {e}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB — QR scanner */}
      <motion.button
        onClick={() => setScanning(true)}
        className="fixed bottom-28 right-5 w-14 h-14 rounded-full gradient-cta text-on-primary shadow-2xl flex items-center justify-center z-20"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.85 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.5 }}
      >
        <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
      </motion.button>

      {/* QR Scanner */}
      {scanning && <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />}

      {/* Leaderboard full modal */}
      <AnimatePresence>
        {showLeaderboard && phraseComplete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLeaderboard(false)}
          >
            <div className="absolute inset-0 bg-on-surface/70 backdrop-blur-sm" />
            <motion.div
              className="relative z-10 w-full max-w-sm bg-surface-container-lowest rounded-3xl p-6 editorial-shadow"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="font-headline text-xl font-bold text-center mb-6">Classement Final</h2>
              {leaderboard.sort((a, b) => b.score - a.score).map((e, i) => (
                <motion.div
                  key={e.teamId}
                  className={`flex items-center justify-between py-3 ${
                    i === 0 ? "text-primary" : "text-on-surface-variant"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className="text-lg font-bold">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}{" "}
                    {e.teamName}
                  </span>
                  <span className="font-mono font-bold text-lg">{e.score}</span>
                </motion.div>
              ))}
              <button
                onClick={() => setShowLeaderboard(false)}
                className="w-full mt-6 py-3 rounded-full bg-surface-container text-on-surface-variant font-bold"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
