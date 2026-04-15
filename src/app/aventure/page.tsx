"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";

const EVENT_ID = "event-default";

interface TimelineStep {
  id: string;
  time: string;
  title: string;
  order: number;
}

type StepStatus = "completed" | "current" | "upcoming";

export default function AventurePage() {
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const [timelinePosition, setTimelinePosition] = useState("");

  // Load steps from Firestore
  useEffect(() => {
    const q = query(collection(db, "events", EVENT_ID, "timeline"), orderBy("order"));
    const unsub = onSnapshot(q, (snap) => {
      setSteps(snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || "",
        time: d.data().time || "",
        order: d.data().order ?? 0,
      })));
    });
    return unsub;
  }, []);

  // Load current position
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "events", EVENT_ID), (snap) => {
      if (snap.exists()) {
        setTimelinePosition(snap.data().timelinePosition || "");
      }
    });
    return unsub;
  }, []);

  const currentIndex = steps.findIndex((s) => s.id === timelinePosition);
  const progress = steps.length > 0 && currentIndex >= 0
    ? Math.round(((currentIndex + 1) / steps.length) * 100)
    : 0;
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;

  function getStatus(index: number): StepStatus {
    if (currentIndex < 0) return index === 0 ? "current" : "upcoming";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "upcoming";
  }

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
      {steps.length > 0 && (
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
      )}

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
              play_circle
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
          {steps.map((step, index) => {
            const status = getStatus(index);
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

        {steps.length === 0 && (
          <div className="text-center py-16 text-on-surface-variant/40">
            <span className="material-symbols-outlined text-4xl block mb-3">schedule</span>
            <p>Le programme sera bientot disponible.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineCard({ step, status }: { step: TimelineStep; status: StepStatus }) {
  const isCompleted = status === "completed";
  const isCurrent = status === "current";

  return (
    <div className="relative pl-10 mb-4 group">
      {/* Dot */}
      <div
        className={`absolute left-0 z-10 rounded-full transition-all ${
          isCompleted
            ? "w-5 h-5 top-3 bg-secondary ring-4 ring-secondary-container/30"
            : isCurrent
            ? "w-5 h-5 top-3 bg-primary ring-4 ring-primary-container/30 animate-pulse"
            : "w-3 h-3 left-1 top-4 bg-outline-variant"
        }`}
      >
        {isCompleted && (
          <span
            className="material-symbols-outlined text-white text-xs absolute inset-0 flex items-center justify-center"
            style={{ fontSize: 12 }}
          >
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
        {/* Time */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs font-bold ${isCurrent ? "text-primary" : isCompleted ? "text-secondary" : "text-outline"}`}>
            {step.time}
          </span>
          {isCompleted && (
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">
              Termine
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={`font-headline text-base font-bold ${
            isCurrent || isCompleted ? "text-on-surface" : "text-on-surface/50"
          }`}
        >
          {step.title}
        </h3>
      </motion.div>
    </div>
  );
}
