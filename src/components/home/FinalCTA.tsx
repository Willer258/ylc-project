"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface FinalCTAProps {
  userName?: string | null;
}

export function FinalCTA({ userName }: FinalCTAProps) {
  return (
    <motion.section
      className="py-20 md:py-24 px-6 text-center"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      {/* Personalized heading */}
      <motion.h2
        className="font-headline text-4xl md:text-5xl font-extrabold text-on-surface leading-tight"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {userName ? (
          <>{userName},<br />ta place t&apos;attend.</>
        ) : (
          <>Ta place t&apos;attend.</>
        )}
      </motion.h2>

      <motion.p
        className="font-body text-lg text-on-surface-variant mt-3"
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        Rejoins la prochaine edition YCL.
      </motion.p>

      {/* CTA Button */}
      <motion.div
        className="mt-8"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 20 }}
      >
        <Link
          href={userName ? "/aventure" : "/jeu"}
          className="inline-flex items-center gap-2 bg-primary text-white px-10 py-4 rounded-full font-bold text-lg hover:brightness-110 transition-all active:scale-95 shadow-lg"
        >
          {userName ? "Voir le programme" : "Commencer"}
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </Link>
      </motion.div>

      {/* Signature verse */}
      <motion.p
        className="font-body text-sm italic text-on-surface-variant/60 mt-12 max-w-sm mx-auto leading-relaxed"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        &laquo; Car la ou deux ou trois sont assembles en mon nom,
        je suis au milieu d&apos;eux. &raquo;
        <br />
        <span className="not-italic font-semibold text-primary/50 text-xs mt-1 block">
          — Matthieu 18:20
        </span>
      </motion.p>
    </motion.section>
  );
}
