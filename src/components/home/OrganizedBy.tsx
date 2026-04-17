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
          VIOLIES est une agence specialisee dans l&apos;evenementiel et le branding.
          Nous accompagnons les entreprises, marques et particuliers pour
          l&apos;organisation de leurs evenements, tout lancements et la visibilite
          de leurs marque. On transforme vos idees en experiences memorables.
        </p>

        <p className="font-body text-sm text-on-surface font-semibold leading-relaxed mt-4">
          VIOLIES, donnez de l&apos;ampleur a vos projets et faites rayonner votre marque.
        </p>
      </div>
    </motion.section>
  );
}
