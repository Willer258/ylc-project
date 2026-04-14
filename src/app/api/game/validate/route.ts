import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { isRateLimited } from "@/lib/rate-limit";
import { FieldValue } from "firebase-admin/firestore";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    const instanceSnap = await adminDb.doc(`gameInstances/${gameId}`).get();
    if (!instanceSnap.exists) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    const gameStatus = instanceSnap.data()?.status;
    if (gameStatus !== "active") {
      return NextResponse.json({ error: "Le jeu n'est pas actif" }, { status: 403 });
    }

    // Get game template
    const templateSnap = await adminDb.doc(`gameTemplates/${gameId}`).get();
    if (!templateSnap.exists) {
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
    const correct = normalize(guess) === normalize(word.value);

    // Update team progress
    const wordKey = `word_${phraseIndex}_${wordIndex}`;
    const progressRef = adminDb.doc(`gameProgress/${gameId}/teams/${teamId}`);
    const progressSnap = await progressRef.get();

    if (!progressSnap.exists) {
      await progressRef.set({
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

      await progressRef.update({
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
        lastActivityAt: FieldValue.serverTimestamp(),
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
      await adminDb.doc(`gameInstances/${gameId}`).update({ leaderboard });

      return NextResponse.json({
        correct: true,
        word: word.value,
        points,
        alreadyCompleted: false,
      });
    } else {
      // Wrong answer
      await progressRef.update({
        [`slots.${wordKey}.attempts`]: newAttempts,
        [`slots.${wordKey}.status`]: "active",
        lastActivityAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        correct: false,
        attempts: newAttempts,
      });
    }
  } catch (err) {
    console.error("Validate error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
