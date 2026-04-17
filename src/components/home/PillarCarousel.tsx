"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";

const PILLARS = [
  {
    icon: "trending_up",
    title: "Evoluer",
    description: "Tu repars avec des outils concrets pour ta vie pro, perso et spirituelle.",
  },
  {
    icon: "group",
    title: "Rencontrer",
    description: "Tu rejoins une communaute de jeunes qui partagent ta vision.",
  },
  {
    icon: "music_note",
    title: "Vibrer",
    description: "Tu vis des moments de louange et de joie qui marquent.",
  },
  {
    icon: "self_improvement",
    title: "Se ressourcer",
    description: "Tu prends du recul, tu te reconnectes a l'essentiel.",
  },
];

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export function PillarCarousel() {
  const [[current, direction], setCurrent] = useState([0, 0]);

  const paginate = useCallback((dir: number) => {
    setCurrent(([prev]) => {
      const next = (prev + dir + PILLARS.length) % PILLARS.length;
      return [next, dir];
    });
  }, []);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => paginate(1), 5000);
    return () => clearInterval(timer);
  }, [paginate]);

  const pillar = PILLARS[current];

  return (
    <motion.section
      className="py-12"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
    >
      <div className="px-6 mb-6">
        <p className="text-sm uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-2">
          Ce qui t&apos;attend
        </p>
        <h2 className="font-headline text-3xl font-bold text-on-surface leading-tight">
          4 raisons de venir.
        </h2>
      </div>

      {/* Carousel */}
      <div className="px-6 relative overflow-hidden" style={{ minHeight: 280 }}>
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) paginate(1);
              else if (info.offset.x > 60) paginate(-1);
            }}
            className="w-full cursor-grab active:cursor-grabbing"
          >
            <div className="bg-surface-container rounded-2xl p-8 h-[280px] flex flex-col justify-between shadow-md">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-primary-container/15 flex items-center justify-center mb-5">
                  <span className="material-symbols-outlined text-[40px] text-primary font-bold">
                    {pillar.icon}
                  </span>
                </div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
                  {pillar.title}
                </h3>
              </div>
              <p className="font-body text-base text-on-surface-variant leading-relaxed">
                {pillar.description}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots + arrows */}
      <div className="flex items-center justify-center gap-4 mt-5 px-6">
        <button
          onClick={() => paginate(-1)}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>

        <div className="flex gap-2">
          {PILLARS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent([i, i > current ? 1 : -1])}
              className={`rounded-full transition-all ${
                i === current
                  ? "w-6 h-2.5 bg-primary"
                  : "w-2.5 h-2.5 bg-on-surface-variant/20"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => paginate(1)}
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors"
        >
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>
    </motion.section>
  );
}
