"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface TimelineStep {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: string;
}

const STEPS: TimelineStep[] = [
  {
    id: "accueil",
    label: "Etape 01",
    title: "Accueil & Inscription",
    description:
      "Bienvenue ! Inscris-toi, rejoins une equipe et votez pour votre capitaine.",
    icon: "waving_hand",
  },
  {
    id: "jeu",
    label: "Etape 02",
    title: "La Chasse au Tresor",
    description:
      "Explorez le lieu, scannez les QR codes et reconstituez la phrase mystere avec votre equipe.",
    icon: "qr_code_scanner",
  },
  {
    id: "photos",
    label: "Etape 03",
    title: "Souvenirs & Galerie",
    description:
      "Prenez des selfies d'equipe et partagez vos meilleurs moments dans la galerie live.",
    icon: "photo_camera",
  },
  {
    id: "cloture",
    label: "Etape 04 • Final",
    title: "Cloture & Celebration",
    description:
      "Revelation des phrases, celebration des equipes et moment de partage.",
    icon: "celebration",
  },
];

type StepStatus = "completed" | "current" | "upcoming";

function getStepStatus(
  stepId: string,
  currentPosition: string
): StepStatus {
  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const currentIndex = STEPS.findIndex((s) => s.id === currentPosition);
  if (currentIndex < 0) return stepIndex === 0 ? "current" : "upcoming";
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

export default function AventurePage() {
  const [timelinePosition, setTimelinePosition] = useState("accueil");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        setTimelinePosition(snap.data().timelinePosition || "accueil");
      }
    });
    return unsub;
  }, []);

  return (
    <div className="pt-6 px-6 max-w-2xl mx-auto">
      {/* Hero */}
      <section className="mb-10">
        <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight mb-3">
          L&apos;Odyssee
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Suivez le deroulement de la soiree. Chaque etape se devoile au fil de
          l&apos;aventure.
        </p>
      </section>

      {/* Timeline */}
      <div className="relative space-y-10">
        {/* Timeline line */}
        <div className="absolute left-6 top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

        {STEPS.map((step) => {
          const status = getStepStatus(step.id, timelinePosition);
          return (
            <TimelineCard key={step.id} step={step} status={status} />
          );
        })}
      </div>
    </div>
  );
}

function TimelineCard({
  step,
  status,
}: {
  step: TimelineStep;
  status: StepStatus;
}) {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  return (
    <div className="relative pl-16 group">
      {/* Dot */}
      <div
        className={`absolute left-3.5 top-0 z-10 rounded-full ${
          isCompleted
            ? "w-5 h-5 bg-secondary ring-8 ring-secondary-container/30"
            : isCurrent
            ? "w-5 h-5 bg-primary ring-8 ring-primary-container/30 animate-pulse"
            : "w-4 h-4 left-4 bg-outline-variant"
        }`}
      />

      {/* Card */}
      <div
        className={`rounded-xl p-6 transition-all ${
          isCurrent
            ? "bg-surface-container-lowest shadow-md border-l-4 border-primary p-8"
            : isCompleted
            ? "bg-surface-container-lowest shadow-sm"
            : "bg-surface-container-low/50"
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <span
              className={`text-xs font-bold tracking-widest uppercase ${
                isCurrent
                  ? "text-primary"
                  : isCompleted
                  ? "text-secondary"
                  : "text-outline"
              }`}
            >
              {step.label}
              {isCurrent && " • En cours"}
            </span>
            <h3
              className={`font-headline text-xl font-bold mt-1 ${
                isCurrent || isCompleted
                  ? "text-on-surface"
                  : "text-on-surface/60"
              }`}
            >
              {step.title}
            </h3>
          </div>
          {isCompleted && (
            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-bold">
              TERMINE
            </span>
          )}
          {isCurrent && (
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              location_on
            </span>
          )}
        </div>
        <p
          className={`text-sm leading-relaxed ${
            isCurrent || isCompleted
              ? "text-on-surface-variant"
              : "text-on-surface-variant/60"
          }`}
        >
          {step.description}
        </p>

        {isCurrent && (
          <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg mt-4">
            <span className="material-symbols-outlined text-primary">
              {step.icon}
            </span>
            <p className="text-sm font-bold text-on-surface">
              C&apos;est le moment ! Participez maintenant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
