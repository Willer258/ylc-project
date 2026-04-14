"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface TeamProgress {
  teamId: string;
  teamName: string;
  score: number;
  completedWords: number;
  rank: number;
}

export default function AdminGameLivePage() {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<string>("waiting");
  const [leaderboard, setLeaderboard] = useState<TeamProgress[]>([]);
  const [templates, setTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [totalWords, setTotalWords] = useState(0);

  // Load event
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        setGameId(snap.data().activeGameId || null);
      }
    });
    return unsub;
  }, []);

  // Load game instance
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameInstances", gameId), (snap) => {
      if (snap.exists()) {
        setGameStatus(snap.data().status || "waiting");
        setLeaderboard(snap.data().leaderboard || []);
      }
    });
    return unsub;
  }, [gameId]);

  // Load templates for selection
  useEffect(() => {
    async function loadTemplates() {
      const snap = await getDocs(collection(db, "gameTemplates"));
      setTemplates(snap.docs.map((d) => ({ id: d.id, name: d.data().name || "Sans nom" })));
    }
    loadTemplates();
  }, []);

  // Load total words count
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, "gameTemplates", gameId), (snap) => {
      if (snap.exists()) {
        const phrases = snap.data().phrases || [];
        const total = phrases.reduce((sum: number, p: { words?: unknown[] }) => sum + (p.words?.length || 0), 0);
        setTotalWords(total);
      }
    });
    return unsub;
  }, [gameId]);

  async function handleStartGame() {
    if (!selectedTemplate) return;

    // Create game instance
    await setDoc(doc(db, "gameInstances", selectedTemplate), {
      templateId: selectedTemplate,
      eventId: EVENT_ID,
      status: "active",
      startedAt: serverTimestamp(),
      leaderboard: [],
      config: {
        pointsBase: 100,
        speedBonus: [30, 20, 10],
        maxPenalty: 25,
        penaltyPerAttempt: 5,
      },
    });

    // Set active game on event
    await updateDoc(doc(db, "events", EVENT_ID), {
      activeGameId: selectedTemplate,
    });

    // Initialize progress for selected teams only
    const teamsSnap = await getDocs(collection(db, "events", EVENT_ID, "teams"));
    const selectedTeamDocs = teamsSnap.docs.filter((d) => selectedTeams.has(d.id));

    for (const teamDoc of selectedTeamDocs) {
      await setDoc(doc(db, "gameProgress", selectedTemplate, "teams", teamDoc.id), {
        score: 0,
        completedWords: 0,
        slots: {},
        lastActivityAt: serverTimestamp(),
      });
    }

    // Update leaderboard with selected team names
    const leaderboardInit = selectedTeamDocs.map((d, i) => ({
      teamId: d.id,
      teamName: d.data().name || d.id,
      score: 0,
      completedWords: 0,
      rank: i + 1,
    }));
    await updateDoc(doc(db, "gameInstances", selectedTemplate), {
      leaderboard: leaderboardInit,
    });
  }

  async function handlePause() {
    if (!gameId) return;
    await updateDoc(doc(db, "gameInstances", gameId), {
      status: gameStatus === "paused" ? "active" : "paused",
    });
  }

  async function handleStop() {
    if (!gameId || !confirm("Arreter le jeu definitivement ?")) return;
    await updateDoc(doc(db, "gameInstances", gameId), {
      status: "ended",
      endedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "events", EVENT_ID), {
      activeGameId: null,
    });
  }

  async function handleReset() {
    if (!gameId || !confirm("Supprimer cette session de jeu et toutes les progressions ?")) return;
    // Delete progress for all teams
    const progressSnap = await getDocs(collection(db, "gameProgress", gameId, "teams"));
    for (const d of progressSnap.docs) {
      await deleteDoc(doc(db, "gameProgress", gameId, "teams", d.id));
    }
    // Delete game instance
    await deleteDoc(doc(db, "gameInstances", gameId));
    // Clear active game
    await updateDoc(doc(db, "events", EVENT_ID), {
      activeGameId: null,
    });
  }

  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());

  // Load teams for selection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events", EVENT_ID, "teams"), (snap) => {
      const teams = snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id }));
      setAvailableTeams(teams);
      setSelectedTeams(new Set(teams.map((t) => t.id))); // Select all by default
    });
    return unsub;
  }, []);

  function toggleTeam(teamId: string) {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  }

  // No game active — show start controls
  if (!gameId) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Panneau Live</h1>

        <div className="bg-white/5 border border-white/5 rounded-xl p-8 max-w-lg">
          <h2 className="text-lg font-bold mb-4">Lancer un jeu</h2>

          {/* Template selection */}
          <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-2 block">
            Template de jeu
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full bg-white/5 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          >
            <option value="">Selectionner un template...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Team selection */}
          <label className="text-xs text-white/30 font-bold uppercase tracking-widest mb-2 block">
            Equipes participantes ({selectedTeams.size}/{availableTeams.length})
          </label>
          <div className="space-y-2 mb-6 max-h-60 overflow-auto">
            {availableTeams.map((team) => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  selectedTeams.has(team.id)
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-white/5 border border-white/5 text-white/40"
                }`}
              >
                <span className={`material-symbols-outlined text-lg ${
                  selectedTeams.has(team.id) ? "text-emerald-400" : "text-white/20"
                }`} style={selectedTeams.has(team.id) ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {selectedTeams.has(team.id) ? "check_circle" : "radio_button_unchecked"}
                </span>
                {team.name}
              </button>
            ))}
            {availableTeams.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">Aucune equipe creee.</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedTeams(new Set(availableTeams.map((t) => t.id)))}
              className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm hover:bg-white/10"
            >
              Tout selectionner
            </button>
            <button
              onClick={() => setSelectedTeams(new Set())}
              className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm hover:bg-white/10"
            >
              Tout deselectionner
            </button>
          </div>

          <button
            onClick={handleStartGame}
            disabled={!selectedTemplate || selectedTeams.size === 0}
            className="w-full py-4 rounded-xl bg-emerald-500 text-white font-bold text-lg hover:bg-emerald-400 disabled:opacity-30 transition-colors mt-6"
          >
            Lancer le jeu ({selectedTeams.size} equipe{selectedTeams.size > 1 ? "s" : ""})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Panneau Live</h1>
          <p className="text-sm text-white/40 mt-1">Game ID: {gameId}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${
            gameStatus === "active"
              ? "bg-emerald-500/10 text-emerald-400"
              : gameStatus === "paused"
              ? "bg-amber-500/10 text-amber-400"
              : "bg-red-500/10 text-red-400"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              gameStatus === "active" ? "bg-emerald-500 animate-pulse" : gameStatus === "paused" ? "bg-amber-500" : "bg-red-500"
            }`} />
            {gameStatus === "active" ? "En cours" : gameStatus === "paused" ? "En pause" : "Termine"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white/70">Controles</h2>

          {gameStatus !== "ended" && (
            <>
              <button
                onClick={handlePause}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  gameStatus === "paused"
                    ? "bg-emerald-500 text-white hover:bg-emerald-400"
                    : "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                }`}
              >
                {gameStatus === "paused" ? "Reprendre le jeu" : "Mettre en pause"}
              </button>

              <button
                onClick={handleStop}
                className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 font-bold text-sm hover:bg-red-500/20 transition-colors"
              >
                Arreter le jeu
              </button>

              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl bg-red-500/5 text-red-400/60 font-bold text-xs hover:bg-red-500/10 transition-colors"
              >
                Supprimer la session
              </button>
            </>
          )}

          {/* Stats */}
          <div className="bg-white/5 rounded-xl p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Equipes</span>
              <span className="text-white font-bold">{leaderboard.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Mots total</span>
              <span className="text-white font-bold">{totalWords}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Score max</span>
              <span className="text-amber-400 font-bold">
                {leaderboard.length > 0 ? Math.max(...leaderboard.map((e) => e.score)) : 0}
              </span>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="md:col-span-2">
          <h2 className="text-lg font-bold text-white/70 mb-4">Classement Live</h2>

          <div className="space-y-2">
            {leaderboard
              .sort((a, b) => b.score - a.score)
              .map((entry, i) => (
                <div
                  key={entry.teamId}
                  className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                    i === 0
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-white/5 border border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-lg w-8 text-center">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                    </span>
                    <div>
                      <p className="font-bold text-white">{entry.teamName}</p>
                      <p className="text-xs text-white/30">
                        {entry.completedWords}/{totalWords} mots
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold font-mono ${
                      i === 0 ? "text-amber-400" : "text-white"
                    }`}>
                      {entry.score}
                    </p>
                    <p className="text-xs text-white/20">pts</p>
                  </div>
                </div>
              ))}
          </div>

          {leaderboard.length === 0 && (
            <div className="text-center py-12 text-white/30">
              En attente des equipes...
            </div>
          )}

          {/* Progress bars */}
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-bold text-white/40 uppercase tracking-widest">
              Progression
            </h3>
            {leaderboard.map((entry) => (
              <div key={entry.teamId}>
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>{entry.teamName}</span>
                  <span>{totalWords > 0 ? Math.round((entry.completedWords / totalWords) * 100) : 0}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: totalWords > 0 ? `${(entry.completedWords / totalWords) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
