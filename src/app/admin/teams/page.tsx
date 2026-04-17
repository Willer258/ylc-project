"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, addDoc, deleteDoc, doc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from "qrcode";

const EVENT_ID = "event-default";

interface Member {
  id: string;
  name: string;
  deviceUUID: string;
  joinedAt: Timestamp | null;
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [qrTeamId, setQrTeamId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events", EVENT_ID, "teams"), async (snap) => {
      const { getDocs, collection: coll } = await import("firebase/firestore");
      const teamsData: Team[] = [];
      for (const d of snap.docs) {
        const membersSnap = await getDocs(coll(db, "events", EVENT_ID, "teams", d.id, "members"));
        teamsData.push({
          id: d.id,
          name: d.data().name,
          memberCount: membersSnap.size,
        });
      }
      setTeams(teamsData);
    });
    return unsub;
  }, []);

  async function toggleMembers(teamId: string) {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      setMembers([]);
      return;
    }
    setExpandedTeamId(teamId);
    setLoadingMembers(true);
    try {
      const membersSnap = await getDocs(collection(db, "events", EVENT_ID, "teams", teamId, "members"));
      setMembers(
        membersSnap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Sans nom",
          deviceUUID: d.data().deviceUUID || d.id,
          joinedAt: d.data().joinedAt || null,
        }))
      );
    } catch (err) {
      console.error("Load members error:", err);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleRemoveMember(teamId: string, memberId: string) {
    if (!confirm("Retirer ce membre de l'equipe ?")) return;
    try {
      await deleteDoc(doc(db, "events", EVENT_ID, "teams", teamId, "members", memberId));
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error("Remove member error:", err);
    }
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim() || creating) return;
    setCreating(true);
    try {
      await addDoc(collection(db, "events", EVENT_ID, "teams"), {
        name: newTeamName.trim(),
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Equipes</h1>
        {teams.length > 0 && (
          <button
            onClick={() => setQrTeamId(qrTeamId === "all" ? null : "all")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              qrTeamId === "all"
                ? "bg-amber-500 text-black"
                : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
            }`}
          >
            {qrTeamId === "all" ? "Masquer les QR" : "Afficher tous les QR"}
          </button>
        )}
      </div>

      {/* All QR codes grid */}
      {qrTeamId === "all" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {teams.map((team) => (
            <TeamQRCard key={team.id} teamId={team.id} teamName={team.name} baseUrl={baseUrl} />
          ))}
        </div>
      )}

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
            className="bg-white/5 border border-white/5 rounded-xl overflow-hidden"
          >
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleMembers(team.id)}
                  className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                  title="Voir les membres"
                >
                  <span
                    className="material-symbols-outlined text-lg transition-transform"
                    style={{ transform: expandedTeamId === team.id ? "rotate(90deg)" : "rotate(0deg)" }}
                  >
                    chevron_right
                  </span>
                </button>
                <div>
                  <h3 className="font-bold text-white">{team.name}</h3>
                  <p className="text-sm text-white/40 mt-1">
                    {team.memberCount} membre{team.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (qrTeamId === team.id) {
                      setQrTeamId(null);
                      setQrDataUrl(null);
                    } else {
                      const url = `${baseUrl}/join/${team.id}`;
                      const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 2 });
                      setQrTeamId(team.id);
                      setQrDataUrl(dataUrl);
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    qrTeamId === team.id
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70"
                  }`}
                  title="Afficher le QR code"
                >
                  <span className="material-symbols-outlined text-lg">qr_code</span>
                </button>
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

            {/* Members panel */}
            {expandedTeamId === team.id && (
              <div className="border-t border-white/5 bg-white/[0.02] px-5 py-4">
                {loadingMembers ? (
                  <p className="text-sm text-white/30 text-center py-3">Chargement...</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-white/30 text-center py-3">Aucun membre dans cette equipe.</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-base text-white/30">person</span>
                          <div>
                            <p className="text-sm font-medium text-white">{member.name}</p>
                            {member.joinedAt && (
                              <p className="text-xs text-white/30">
                                Rejoint le {member.joinedAt.toDate().toLocaleDateString("fr-FR")}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(team.id, member.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-colors"
                          title="Retirer le membre"
                        >
                          <span className="material-symbols-outlined text-base">person_remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* QR code panel */}
            {qrTeamId === team.id && qrDataUrl && (
              <div className="border-t border-white/5 bg-white/[0.02] px-5 py-6 flex flex-col items-center gap-3">
                <img src={qrDataUrl} alt={`QR ${team.name}`} className="w-48 h-48 rounded-xl" />
                <p className="text-xs text-white/40">{baseUrl}/join/{team.id}</p>
                <button
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = qrDataUrl;
                    a.download = `equipe-${team.name.replace(/\s+/g, "-").toLowerCase()}.png`;
                    a.click();
                  }}
                  className="px-4 py-2 rounded-lg bg-white/5 text-white/40 text-sm font-bold hover:bg-white/10 transition-colors"
                >
                  Telecharger
                </button>
              </div>
            )}
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

// === Team QR Card (for grid view) ===
function TeamQRCard({ teamId, teamName, baseUrl }: { teamId: string; teamName: string; baseUrl: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(`${baseUrl}/join/${teamId}`, { width: 250, margin: 2 }).then(setDataUrl);
  }, [teamId, baseUrl]);

  return (
    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center gap-3">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR ${teamName}`} className="w-full aspect-square rounded-lg" />
      ) : (
        <div className="w-full aspect-square rounded-lg bg-white/5 animate-pulse" />
      )}
      <p className="text-sm font-bold text-white text-center">{teamName}</p>
      <button
        onClick={() => {
          if (!dataUrl) return;
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `equipe-${teamName.replace(/\s+/g, "-").toLowerCase()}.png`;
          a.click();
        }}
        className="text-xs text-white/30 hover:text-white/60 transition-colors"
      >
        Telecharger
      </button>
    </div>
  );
}
