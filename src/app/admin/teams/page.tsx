"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface Team {
  id: string;
  name: string;
  maxSize: number;
  memberCount: number;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events", EVENT_ID, "teams"), async (snap) => {
      const { getDocs, collection: coll } = await import("firebase/firestore");
      const teamsData: Team[] = [];
      for (const d of snap.docs) {
        const membersSnap = await getDocs(coll(db, "events", EVENT_ID, "teams", d.id, "members"));
        teamsData.push({
          id: d.id,
          name: d.data().name,
          maxSize: d.data().maxSize || 5,
          memberCount: membersSnap.size,
        });
      }
      setTeams(teamsData);
    });
    return unsub;
  }, []);

  async function handleCreateTeam() {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    try {
      await addDoc(collection(db, "events", EVENT_ID, "teams"), {
        name: newTeamName.trim(),
        maxSize: 5,
        captainId: null,
        captainVoteOpen: false,
        assignedPhraseId: null,
        wordsFound: [],
        completed: false,
        completedAt: null,
        createdAt: serverTimestamp(),
      });
      setNewTeamName("");
    } catch (err) {
      console.error("Create team error:", err);
    } finally {
      setCreating(false);
    }
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Equipes</h1>

      {/* Create team */}
      <div className="flex gap-3 mb-8">
        <input
          type="text"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Nom de la nouvelle equipe..."
          className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
          onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
        />
        <button
          onClick={handleCreateTeam}
          disabled={!newTeamName.trim() || creating}
          className="px-6 py-3 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 disabled:opacity-30 transition-colors"
        >
          + Creer
        </button>
      </div>

      {/* Teams list */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-white/5 border border-white/5 rounded-xl p-5 flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold text-white">{team.name}</h3>
              <p className="text-sm text-white/40 mt-1">
                {team.memberCount} / {team.maxSize} membres
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-white/30 mb-1">Lien d&apos;invitation</p>
                <code className="text-xs text-amber-400/80 bg-amber-400/5 px-2 py-1 rounded">
                  {baseUrl}/join/{team.id}
                </code>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(`${baseUrl}/join/${team.id}`)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                title="Copier le lien"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
              </button>
              <button
                onClick={async () => {
                  if (!confirm(`Supprimer l'equipe "${team.name}" ?`)) return;
                  // Delete members subcollection first
                  const membersSnap = await getDocs(collection(db, "events", EVENT_ID, "teams", team.id, "members"));
                  for (const m of membersSnap.docs) {
                    await deleteDoc(doc(db, "events", EVENT_ID, "teams", team.id, "members", m.id));
                  }
                  await deleteDoc(doc(db, "events", EVENT_ID, "teams", team.id));
                }}
                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                title="Supprimer"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="text-center py-12 text-white/30">
            Aucune equipe. Creez-en une pour commencer.
          </div>
        )}
      </div>
    </div>
  );
}
