"use client";

import { useState, useEffect } from "react";
import { collection, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "./auth-provider";
import { setTeamId as storeTeamId, setEventId } from "@/lib/auth";

const EVENT_ID = "event-default";

interface Team {
  id: string;
  name: string;
  memberCount: number;
}

export function TeamSelection() {
  const { uuid, userName, setTeamId } = useAuthContext();
  const [teams, setTeams] = useState<Team[]>([]);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "events", EVENT_ID, "teams"),
      async (snap) => {
        const teamsData: Team[] = [];
        for (const teamDoc of snap.docs) {
          const data = teamDoc.data();
          const membersSnap = await import("firebase/firestore").then(
            ({ getDocs, collection: coll }) =>
              getDocs(coll(db, "events", EVENT_ID, "teams", teamDoc.id, "members"))
          );
          teamsData.push({
            id: teamDoc.id,
            name: data.name,
            memberCount: membersSnap.size,
          });
        }
        setTeams(teamsData);
      }
    );
    return unsub;
  }, []);

  async function handleJoin(teamId: string) {
    setJoining(teamId);
    setError(null);

    try {
      const memberRef = doc(db, "events", EVENT_ID, "teams", teamId, "members", uuid);
      const existing = await getDoc(memberRef);
      if (!existing.exists()) {
        await setDoc(memberRef, {
          name: userName,
          deviceUUID: uuid,
          joinedAt: serverTimestamp(),
          captainVote: null,
        });
      }

      storeTeamId(teamId);
      setEventId(EVENT_ID);
      setTeamId(teamId);
    } catch (err) {
      console.error("Join team error:", err);
      setError("Erreur lors de l'inscription. Reessaie.");
      setJoining(null);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col px-6 pt-12 pb-8 bg-background">
      <div className="max-w-sm mx-auto w-full space-y-8">
        <div className="space-y-3">
          <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight">
            Choisis ton equipe
          </h1>
          <p className="text-on-surface-variant">
            Rejoins une equipe pour commencer l&apos;aventure, {userName} !
          </p>
        </div>

        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {teams.map((team) => {
            const isJoining = joining === team.id;

            return (
              <button
                key={team.id}
                onClick={() => handleJoin(team.id)}
                disabled={isJoining}
                className="w-full text-left p-5 rounded-2xl transition-all active:scale-[0.98] bg-surface-container-lowest editorial-shadow hover:shadow-lg"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-headline text-lg font-bold text-on-surface">
                      {team.name}
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-1">
                      {team.memberCount} membre{team.memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isJoining ? (
                      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined text-primary">
                        arrow_forward
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {teams.length === 0 && (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">
                groups
              </span>
              Aucune equipe disponible pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
