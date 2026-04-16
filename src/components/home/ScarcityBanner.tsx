"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export function ScarcityBanner() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <section className="bg-on-surface py-14 md:py-20 relative overflow-hidden">
      {/* Diagonal trait (echo du hero) */}
      <div
        className="absolute top-0 right-0 w-[35%] h-[2px] bg-primary-container/30 origin-top-right"
        style={{ transform: "rotate(15deg) translateY(40px)" }}
      />

      <div ref={ref} className="text-center px-6">
        {/* "01" — 1ere edition */}
        <motion.span
          className="block font-headline text-[140px] md:text-[180px] font-extrabold text-primary-container leading-none tracking-tighter"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          01
        </motion.span>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <p className="text-sm uppercase tracking-[0.3em] text-primary-container/70 font-bold mb-3">
            Premiere edition
          </p>
          <p className="font-headline text-2xl md:text-3xl font-medium text-background leading-snug">
            Un rendez-vous unique.
            <br />
            Une journee qui marque.
          </p>
          <p className="font-body text-base text-background/60 mt-4 max-w-sm mx-auto">
            50 a 100 jeunes de 18 a 35 ans, un lieu inedit,
            une experience qu&apos;on ne rejoue pas.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
