"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";

const EVENT_ID = "event-default";

interface Member {
  id: string;
  name: string;
}

export function TeamInfo() {
  const { teamId, uuid } = useAuthContext();
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!teamId) return;

    const teamUnsub = onSnapshot(
      doc(db, "events", EVENT_ID, "teams", teamId),
      (snap) => {
        if (snap.exists()) {
          setTeamName(snap.data().name || "");
        }
      }
    );

    const membersUnsub = onSnapshot(
      collection(db, "events", EVENT_ID, "teams", teamId, "members"),
      (snap) => {
        setMembers(
          snap.docs.map((d) => ({ id: d.id, name: d.data().name }))
        );
      }
    );

    return () => {
      teamUnsub();
      membersUnsub();
    };
  }, [teamId]);

  if (!teamId) return null;

  return (
    <div className="space-y-4 mt-8 mx-auto max-w-4xl">
      {/* Team header */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 editorial-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">
              Ton equipe
            </p>
            <h3 className="font-headline text-xl font-bold text-on-surface">
              {teamName}
            </h3>
          </div>
          <div className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold">
            {members.length} membres
          </div>
        </div>

        {/* Members list */}
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const isMe = member.id === uuid;

            return (
              <div
                key={member.id}
                className="flex items-center gap-2 px-3 py-2 rounded-full text-sm bg-surface-container text-on-surface-variant"
              >
                {member.name}
                {isMe && <span className="text-xs opacity-60">(toi)</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
