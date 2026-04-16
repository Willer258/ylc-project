"use client";

import { motion } from "framer-motion";
import { PillarCard } from "./PillarCard";

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

export function PillarCarousel() {
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

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-6 pb-4 scrollbar-hide">
        {PILLARS.map((pillar, i) => (
          <PillarCard key={pillar.title} {...pillar} index={i} />
        ))}
        {/* Spacer for last card peek */}
        <div className="flex-shrink-0 w-4" />
      </div>
    </motion.section>
  );
}
