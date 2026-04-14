import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (server-side)
if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}
const adminDb = getFirestore();

function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove accents
}

export async function POST(req: NextRequest) {
  try {
    const { gameId, teamId, phraseIndex, wordIndex, guess, userId } = await req.json();

    if (!gameId || !teamId || phraseIndex == null || wordIndex == null || !guess) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Get game template
    const templateSnap = await adminDb.doc(`gameTemplates/${gameId}`).get();
    if (!templateSnap.exists) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
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
      // Create initial progress
      await progressRef.set({
        score: 0,
        completedWords: 0,
        slots: {},
        lastActivityAt: new Date(),
      });
    }

    const currentSlot = progressSnap.data()?.slots?.[wordKey] || {
      status: "active",
      attempts: 0,
      hintsUsed: 0,
      hintsUnlocked: [],
      completedAt: null,
    };

    // Already completed
    if (currentSlot.status === "completed") {
      return NextResponse.json({
        correct: true,
        alreadyCompleted: true,
        word: word.value,
      });
    }

    // Increment attempts
    const newAttempts = (currentSlot.attempts || 0) + 1;

    if (correct) {
      // Calculate score
      const hintsUsed = currentSlot.hintsUsed || 0;
      let multiplier = 1;
      if (hintsUsed === 0) multiplier = 2;
      else if (hintsUsed === 1) multiplier = 1.5;
      else if (hintsUsed === 2) multiplier = 1.2;

      const penalty = Math.min((newAttempts - 1) * 5, 25);
      const basePoints = 100;
      const points = Math.max(Math.round(basePoints * multiplier - penalty), 50);

      const currentScore = progressSnap.data()?.score || 0;
      const currentCompleted = progressSnap.data()?.completedWords || 0;

      await progressRef.update({
        [`slots.${wordKey}`]: {
          ...currentSlot,
          status: "completed",
          attempts: newAttempts,
          completedAt: new Date(),
          completedBy: userId,
          pointsEarned: points,
        },
        score: currentScore + points,
        completedWords: currentCompleted + 1,
        lastActivityAt: new Date(),
      });

      // Update leaderboard in game instance
      const instanceRef = adminDb.doc(`gameInstances/${gameId}`);
      const instanceSnap = await instanceRef.get();
      if (instanceSnap.exists) {
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
        // Sort by score desc
        leaderboard.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
        // Add ranks
        leaderboard.forEach((e: { rank: number }, i: number) => { e.rank = i + 1; });
        await instanceRef.update({ leaderboard });
      }

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
        lastActivityAt: new Date(),
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
