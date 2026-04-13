"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";

const EVENT_ID = "event-default";

interface TeamMember {
  id: string;
  name: string;
  captainVote: string | null;
}

interface VoteState {
  members: TeamMember[];
  captainId: string | null;
  voteOpen: boolean;
  myVote: string | null;
  loading: boolean;
}

export function CaptainVote() {
  const { uuid, teamId } = useAuthContext();
  const [state, setState] = useState<VoteState>({
    members: [],
    captainId: null,
    voteOpen: false,
    myVote: null,
    loading: true,
  });
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    // Listen to team doc for captainId and voteOpen
    const teamUnsub = onSnapshot(
      doc(db, "events", EVENT_ID, "teams", teamId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setState((prev) => ({
            ...prev,
            captainId: data.captainId || null,
            voteOpen: data.captainVoteOpen || false,
          }));
        }
      }
    );

    // Listen to members subcollection
    const membersUnsub = onSnapshot(
      collection(db, "events", EVENT_ID, "teams", teamId, "members"),
      (snap) => {
        const members: TeamMember[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name,
          captainVote: d.data().captainVote || null,
        }));
        const myMember = members.find((m) => m.id === uuid);
        setState((prev) => ({
          ...prev,
          members,
          myVote: myMember?.captainVote || null,
          loading: false,
        }));
      }
    );

    return () => {
      teamUnsub();
      membersUnsub();
    };
  }, [teamId, uuid]);

  const handleVote = useCallback(
    async (candidateId: string) => {
      if (!teamId || voting || state.myVote) return;
      setVoting(true);

      try {
        // Record my vote
        await updateDoc(
          doc(db, "events", EVENT_ID, "teams", teamId, "members", uuid),
          { captainVote: candidateId }
        );

        // Check if all members have voted
        const membersSnap = await import("firebase/firestore").then(
          ({ getDocs, collection: coll }) =>
            getDocs(coll(db, "events", EVENT_ID, "teams", teamId, "members"))
        );
        const allMembers = membersSnap.docs.map((d) => d.data());
        const updatedVotes = allMembers.map((m) =>
          m.deviceUUID === uuid ? candidateId : m.captainVote
        );
        const allVoted = updatedVotes.every((v) => v != null);

        if (allVoted) {
          // Tally votes
          const tally: Record<string, number> = {};
          for (const vote of updatedVotes) {
            if (vote) tally[vote] = (tally[vote] || 0) + 1;
          }

          // Find winner(s)
          const maxVotes = Math.max(...Object.values(tally));
          const winners = Object.entries(tally)
            .filter(([, count]) => count === maxVotes)
            .map(([id]) => id);

          // If tie, random pick
          const captainId =
            winners.length === 1
              ? winners[0]
              : winners[Math.floor(Math.random() * winners.length)];

          await updateDoc(doc(db, "events", EVENT_ID, "teams", teamId), {
            captainId,
            captainVoteOpen: false,
          });
        }
      } catch (err) {
        console.error("Vote error:", err);
      } finally {
        setVoting(false);
      }
    },
    [teamId, uuid, voting, state.myVote]
  );

  if (state.loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Captain already elected
  if (state.captainId) {
    const captain = state.members.find((m) => m.id === state.captainId);
    return (
      <div className="bg-surface-container-lowest rounded-2xl p-5 editorial-shadow">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-cta flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-lg">
              star
            </span>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
              Capitaine
            </p>
            <p className="font-headline font-bold text-on-surface text-lg">
              {captain?.name || "Inconnu"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Vote not yet started
  if (!state.voteOpen) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-5">
        <p className="text-on-surface-variant text-sm text-center">
          Le vote pour le capitaine n&apos;a pas encore commence.
          <br />
          L&apos;admin va bientot l&apos;activer !
        </p>
      </div>
    );
  }

  // Vote in progress
  const votedCount = state.members.filter((m) => m.captainVote).length;

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 editorial-shadow space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-headline font-bold text-on-surface">
          Votez pour le capitaine
        </h3>
        <span className="text-xs text-on-surface-variant">
          {votedCount}/{state.members.length} votes
        </span>
      </div>

      <div className="space-y-2">
        {state.members.map((member) => {
          const isMe = member.id === uuid;
          const isMyVote = state.myVote === member.id;
          const hasVoted = !!state.myVote;

          return (
            <button
              key={member.id}
              onClick={() => handleVote(member.id)}
              disabled={hasVoted || voting}
              className={`w-full flex items-center justify-between p-4 rounded-xl transition-all active:scale-[0.98] ${
                isMyVote
                  ? "bg-primary/10 ring-2 ring-primary"
                  : hasVoted
                  ? "bg-surface-container opacity-60"
                  : "bg-surface-container hover:bg-surface-container-high"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isMyVote
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-on-surface">
                  {member.name}
                  {isMe && (
                    <span className="text-xs text-on-surface-variant ml-2">
                      (toi)
                    </span>
                  )}
                </span>
              </div>
              {isMyVote && (
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              )}
            </button>
          );
        })}
      </div>

      {state.myVote && (
        <p className="text-center text-xs text-on-surface-variant">
          Vote enregistre ! En attente des autres...
        </p>
      )}
    </div>
  );
}
