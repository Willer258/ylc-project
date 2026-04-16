"use client";

import { motion } from "framer-motion";

const PROMISES = [
  {
    icon: "handshake",
    title: "Des rencontres qui comptent",
    text: "Connecte avec des jeunes qui partagent ta vision — ambition, foi, vie reelle.",
  },
  {
    icon: "rocket_launch",
    title: "Des cles pour avancer",
    text: "Des temps d'enseignement, de partage et d'activites pour repartir equipe.",
  },
  {
    icon: "celebration",
    title: "Une journee qui respire",
    text: "De la louange, du fun, du sens — une pause qui fait du bien.",
  },
];

export function SocialProof() {
  return (
    <motion.section
      className="py-12 px-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center mb-10">
        <p className="text-sm uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-2">
          La promesse
        </p>
        <h2 className="font-headline text-3xl font-bold text-on-surface leading-tight">
          Une journee, trois temps forts.
        </h2>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {PROMISES.map((p, i) => (
          <motion.div
            key={p.title}
            className="flex gap-4 items-start p-5 bg-surface-container rounded-2xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary-container/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[24px]">
                {p.icon}
              </span>
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-on-surface mb-1">
                {p.title}
              </h3>
              <p className="font-body text-sm text-on-surface-variant leading-relaxed">
                {p.text}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
