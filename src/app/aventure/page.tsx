"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_ID = "event-default";

interface TimelineStep {
  id: string;
  time: string;
  title: string;
  description: string;
  icon: string;
  category: "accueil" | "spirituel" | "social" | "jeu" | "spectacle" | "repas" | "cloture";
}

const STEPS: TimelineStep[] = [
  {
    id: "accueil",
    time: "15h00 – 15h30",
    title: "Accueil & Installation",
    description: "Bienvenue ! Installez-vous et preparez-vous pour une soiree inoubliable.",
    icon: "waving_hand",
    category: "accueil",
  },
  {
    id: "priere",
    time: "15h30 – 15h50",
    title: "Priere & Mot d'ouverture",
    description: "Moment de priere collective et discours d'ouverture de la soiree.",
    icon: "church",
    category: "spirituel",
  },
  {
    id: "cocktail",
    time: "15h50 – 16h15",
    title: "Cocktail & Networking",
    description: "Presentation, visite des stands et moment de rencontre entre participants.",
    icon: "local_bar",
    category: "social",
  },
  {
    id: "quiz-culture",
    time: "16h15 – 16h30",
    title: "Quiz Culture Generale",
    description: "Testez vos connaissances dans un quiz fun et dynamique !",
    icon: "quiz",
    category: "jeu",
  },
  {
    id: "panel",
    time: "16h30 – 17h20",
    title: "Panel & Reseau Pro",
    description: "Panel de discussion et presentation du reseau professionnel chretien.",
    icon: "groups",
    category: "social",
  },
  {
    id: "animation-table",
    time: "17h20 – 17h35",
    title: "Animation & Jeux de table",
    description: "Pause ludique avec des jeux de table entre equipes.",
    icon: "casino",
    category: "jeu",
  },
  {
    id: "quiz-bible",
    time: "17h35 – 18h00",
    title: "Quiz Biblique & Devine qui c'est",
    description: "Une lettre pour un terme biblique + le jeu 'Devine qui c'est' !",
    icon: "menu_book",
    category: "jeu",
  },
  {
    id: "defile",
    time: "18h00 – 18h40",
    title: "Prestation & Defile",
    description: "Moment artistique avec prestations et defile des participants.",
    icon: "star",
    category: "spectacle",
  },
  {
    id: "jeux-saut",
    time: "18h40 – 19h10",
    title: "Jeux de saut & Devinettes",
    description: "Jeux physiques et devinettes de mots — bougez et reflechissez !",
    icon: "directions_run",
    category: "jeu",
  },
  {
    id: "buffet",
    time: "19h10 – 19h50",
    title: "Ouverture du Buffet",
    description: "Bon appetit ! Profitez du repas et des echanges entre equipes.",
    icon: "restaurant",
    category: "repas",
  },
  {
    id: "tournoi",
    time: "19h50 – 20h10",
    title: "Tournoi & Jeu Alphabet",
    description: "Jeu tournoi entre equipes + le jeu 'Alphabet t'en verser'.",
    icon: "emoji_events",
    category: "jeu",
  },
  {
    id: "concert",
    time: "20h10 – 20h40",
    title: "Concert",
    description: "Moment musical — louange, chants et celebration ensemble.",
    icon: "music_note",
    category: "spectacle",
  },
  {
    id: "jeu-global",
    time: "20h40 – 20h50",
    title: "Jeu Global",
    description: "Le grand jeu final qui reunit toutes les equipes !",
    icon: "celebration",
    category: "jeu",
  },
  {
    id: "cloture",
    time: "20h50 – 21h00",
    title: "Mot de Fin",
    description: "Remerciements, bilan de la soiree et mot de cloture.",
    icon: "favorite",
    category: "cloture",
  },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  accueil: { bg: "bg-primary-fixed/50", text: "text-primary", dot: "bg-primary" },
  spirituel: { bg: "bg-secondary-container/50", text: "text-secondary", dot: "bg-secondary" },
  social: { bg: "bg-tertiary-fixed/50", text: "text-tertiary", dot: "bg-tertiary" },
  jeu: { bg: "bg-primary-container/30", text: "text-primary-container", dot: "bg-primary-container" },
  spectacle: { bg: "bg-primary-fixed-dim/30", text: "text-primary", dot: "bg-primary-fixed-dim" },
  repas: { bg: "bg-secondary-container/50", text: "text-secondary", dot: "bg-secondary" },
  cloture: { bg: "bg-surface-container-highest/50", text: "text-on-surface-variant", dot: "bg-on-surface-variant" },
};

const CATEGORY_LABELS: Record<string, string> = {
  accueil: "Accueil",
  spirituel: "Spirituel",
  social: "Social",
  jeu: "Jeu",
  spectacle: "Spectacle",
  repas: "Repas",
  cloture: "Cloture",
};

type StepStatus = "completed" | "current" | "upcoming";

function getStepStatus(stepId: string, currentPosition: string): StepStatus {
  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const currentIndex = STEPS.findIndex((s) => s.id === currentPosition);
  if (currentIndex < 0) return stepIndex === 0 ? "current" : "upcoming";
  if (stepIndex < currentIndex) return "completed";
  if (stepIndex === currentIndex) return "current";
  return "upcoming";
}

function getProgress(currentPosition: string): number {
  const currentIndex = STEPS.findIndex((s) => s.id === currentPosition);
  if (currentIndex < 0) return 0;
  return Math.round(((currentIndex + 1) / STEPS.length) * 100);
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

  const progress = getProgress(timelinePosition);
  const currentStep = STEPS.find((s) => s.id === timelinePosition);

  return (
    <div className="pt-6 max-w-2xl mx-auto">
      {/* Hero */}
      <motion.section
        className="mb-6 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight mb-3">
          Programme
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Suivez le deroulement de la soiree en direct.
        </p>
      </motion.section>

      {/* Progress bar */}
      <motion.div
        className="mx-6 mb-6"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ transformOrigin: "left" }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Progression
          </span>
          <span className="text-xs font-bold text-primary">{progress}%</span>
        </div>
        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-cta rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Current step highlight */}
      {currentStep && (
        <motion.div
          className="mx-6 mb-6 bg-primary/5 rounded-2xl p-5 border-l-4 border-primary"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          key={currentStep.id}
        >
          <div className="flex items-center gap-3">
            <motion.span
              className="material-symbols-outlined text-primary text-2xl"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {currentStep.icon}
            </motion.span>
            <div>
              <p className="text-xs text-primary font-bold uppercase tracking-widest">En cours</p>
              <p className="font-headline font-bold text-on-surface">{currentStep.title}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{currentStep.time}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Timeline */}
      <div className="relative px-6 pb-8">
        {/* Timeline line */}
        <div className="absolute left-[2.35rem] top-4 bottom-4 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

        <AnimatePresence mode="popLayout">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id, timelinePosition);
            return (
              <motion.div
                key={step.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.04,
                  layout: { type: "spring", stiffness: 300, damping: 25 },
                }}
              >
                <TimelineCard step={step} status={status} />
              </motion.div>
            );
          })}
        </AnimatePresence>
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
  const colors = CATEGORY_COLORS[step.category] || CATEGORY_COLORS.accueil;

  return (
    <div className="relative pl-10 mb-4 group">
      {/* Dot */}
      <div
        className={`absolute left-0 top-3 z-10 rounded-full transition-all ${
          isCompleted
            ? `w-5 h-5 ${colors.dot} ring-4 ring-secondary-container/30`
            : isCurrent
            ? `w-5 h-5 ${colors.dot} ring-4 ring-primary-container/30 animate-pulse`
            : "w-3 h-3 left-1 top-4 bg-outline-variant"
        }`}
      >
        {isCompleted && (
          <span className="material-symbols-outlined text-white text-xs absolute inset-0 flex items-center justify-center" style={{ fontSize: 12 }}>
            check
          </span>
        )}
      </div>

      {/* Card */}
      <motion.div
        className={`rounded-xl p-4 transition-all ${
          isCurrent
            ? "bg-surface-container-lowest shadow-md border-l-4 border-primary py-5"
            : isCompleted
            ? "bg-surface-container-lowest/80"
            : "bg-surface-container-low/40"
        }`}
        whileHover={!isCurrent ? { x: 4, backgroundColor: "rgba(248,243,238,1)" } : {}}
      >
        {/* Time + Category */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-bold ${isCurrent ? "text-primary" : isCompleted ? colors.text : "text-outline"}`}>
            {step.time}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
            {CATEGORY_LABELS[step.category]}
          </span>
          {isCompleted && (
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
              Termine
            </span>
          )}
        </div>

        {/* Title */}
        <div className="flex items-center gap-2">
          <span
            className={`material-symbols-outlined text-lg ${
              isCurrent ? "text-primary" : isCompleted ? colors.text : "text-on-surface-variant/40"
            }`}
            style={isCurrent || isCompleted ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            {step.icon}
          </span>
          <h3
            className={`font-headline text-base font-bold ${
              isCurrent || isCompleted ? "text-on-surface" : "text-on-surface/50"
            }`}
          >
            {step.title}
          </h3>
        </div>

        {/* Description — only for current */}
        {isCurrent && (
          <motion.p
            className="text-sm text-on-surface-variant leading-relaxed mt-2 ml-7"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 0.1 }}
          >
            {step.description}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
