import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const { gameId, teamId, phraseIndex, wordIndex, guess, userId } = await req.json();

    if (!gameId || !teamId || phraseIndex == null || wordIndex == null || !guess) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Rate limiting: 20 attempts per minute per team+word
    const rateLimitKey = `${teamId}_${phraseIndex}_${wordIndex}`;
    if (isRateLimited(rateLimitKey, 20, 60_000)) {
      return NextResponse.json(
        { error: "Trop de tentatives. Attendez un moment." },
        { status: 429 }
      );
    }

    // Get game instance — verify game is active
    const instanceSnap = await getDoc(doc(db, "gameInstances", gameId));
    if (!instanceSnap.exists()) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    const gameStatus = instanceSnap.data()?.status;
    if (gameStatus !== "active") {
      return NextResponse.json({ error: "Le jeu n'est pas actif" }, { status: 403 });
    }

    // Get game template
    const templateSnap = await getDoc(doc(db, "gameTemplates", gameId));
    if (!templateSnap.exists()) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const phrases = templateSnap.data()?.phrases || [];
    const phrase = phrases[phraseIndex];
    if (!phrase) {
      return NextResponse.json({ error: "Phrase not found" }, { status: 404 });
    }

    const word = phrase.words?.[wordIndex];
    if (!word) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    // Normalize and compare
    const normalizedGuess = normalize(guess);
    const normalizedWord = normalize(word.value);
    const correct = normalizedGuess === normalizedWord;

    // Update team progress
    const wordKey = `word_${phraseIndex}_${wordIndex}`;
    const progressRef = doc(db, "gameProgress", gameId, "teams", teamId);
    const progressSnap = await getDoc(progressRef);

    if (!progressSnap.exists()) {
      await setDoc(progressRef, {
        score: 0,
        completedWords: 0,
        slots: {},
        lastActivityAt: new Date(),
      });
    }

    const slots = progressSnap.data()?.slots || {};
    const currentSlot = slots[wordKey] || {
      status: "active",
      attempts: 0,
      hintsUsed: 0,
      hintsUnlocked: [],
      completedAt: null,
    };

    // Already completed — return the word
    if (currentSlot.status === "completed") {
      return NextResponse.json({
        correct: true,
        alreadyCompleted: true,
        word: word.value,
      });
    }

    const newAttempts = (currentSlot.attempts || 0) + 1;

    if (correct) {
      // Calculate score — POSITIVE ONLY, no penalties
      const hintsUsed = currentSlot.hintsUsed || 0;
      const basePoints = 100;
      const noHintBonus = hintsUsed === 0 ? 50 : 0; // +50 if no hints used
      const points = basePoints + noHintBonus;

      const currentScore = progressSnap.data()?.score || 0;
      const currentCompleted = progressSnap.data()?.completedWords || 0;

      await updateDoc(progressRef, {
        [`slots.${wordKey}`]: {
          ...currentSlot,
          status: "completed",
          attempts: newAttempts,
          completedAt: new Date(),
          completedBy: userId,
          completedWord: word.value,
          pointsEarned: points,
        },
        score: currentScore + points,
        completedWords: currentCompleted + 1,
        lastActivityAt: serverTimestamp(),
      });

      // Update leaderboard
      const leaderboard = instanceSnap.data()?.leaderboard || [];
      const teamEntry = leaderboard.find((e: { teamId: string }) => e.teamId === teamId);
      if (teamEntry) {
        teamEntry.score = currentScore + points;
        teamEntry.completedWords = currentCompleted + 1;
      } else {
        leaderboard.push({
          teamId,
          score: points,
          completedWords: 1,
        });
      }
      leaderboard.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
      leaderboard.forEach((e: { rank: number }, i: number) => { e.rank = i + 1; });
      await updateDoc(doc(db, "gameInstances", gameId), { leaderboard });

      return NextResponse.json({
        correct: true,
        word: word.value,
        points,
        alreadyCompleted: false,
      });
    } else {
      // Wrong answer — check if we should auto-unlock a hint
      const wordHints: Array<{ type: string }> = word.hints || [];
      const alreadyUnlocked: string[] = currentSlot.hintsUnlocked || [];
      let newHintsUnlocked = [...alreadyUnlocked];
      let newHintsUsed = currentSlot.hintsUsed || 0;
      let hintUnlockedType: string | null = null;

      // After 3 attempts → unlock first available hint
      // After 6 attempts → unlock second available hint
      const thresholds = [3, 6];
      for (const threshold of thresholds) {
        if (newAttempts >= threshold) {
          const nextHint = wordHints.find(
            (h) => !newHintsUnlocked.includes(h.type)
          );
          if (nextHint) {
            newHintsUnlocked.push(nextHint.type);
            newHintsUsed += 1;
            hintUnlockedType = nextHint.type;
          }
        }
      }

      await updateDoc(progressRef, {
        [`slots.${wordKey}.attempts`]: newAttempts,
        [`slots.${wordKey}.status`]: "active",
        [`slots.${wordKey}.hintsUnlocked`]: newHintsUnlocked,
        [`slots.${wordKey}.hintsUsed`]: newHintsUsed,
        lastActivityAt: serverTimestamp(),
      });

      return NextResponse.json({
        correct: false,
        attempts: newAttempts,
        hintUnlocked: hintUnlockedType,
        hintsUnlocked: newHintsUnlocked,
      });
    }
  } catch (err) {
    console.error("Validate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
