"use client";

import { motion } from "framer-motion";

export function OrganizedBy() {
  return (
    <motion.section
      className="bg-surface-container py-14 px-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
    >
      <div className="text-center max-w-lg mx-auto">
        <p className="text-sm uppercase tracking-[0.2em] text-on-surface-variant/60 font-bold mb-3">
          Organise par
        </p>

        <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-5">
          Violies
        </h2>

        <p className="font-body text-base text-on-surface-variant leading-relaxed">
          Fondee par{" "}
          <strong className="text-on-surface">Leslie Massa</strong> et{" "}
          <strong className="text-on-surface">Eve Kale</strong>,
          Violies est une entreprise evenementielle qui orchestre mariages,
          anniversaires, rendez-vous comme YCL, et plus encore.
        </p>

        <p className="font-body text-sm text-on-surface-variant/80 leading-relaxed mt-4 italic">
          &laquo; Permettre un sourire et assurer un evenement des plus
          agreables a nos clients. &raquo;
        </p>
      </div>
    </motion.section>
  );
}
