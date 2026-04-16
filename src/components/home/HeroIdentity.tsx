"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

interface HeroIdentityProps {
  backgroundImage?: string;
}

export function HeroIdentity({ backgroundImage }: HeroIdentityProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <motion.section
      ref={ref}
      className="relative h-[100svh] min-h-[520px] w-full overflow-hidden flex flex-col justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background photo or fallback gradient */}
      {backgroundImage ? (
        <motion.img
          src={backgroundImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ scale: bgScale }}
        />
      ) : (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/15 to-tertiary/20"
          style={{ scale: bgScale }}
        />
      )}

      {/* Overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

      {/* Diagonal signature trait */}
      <div
        className="absolute bottom-0 left-0 w-[40%] h-[2px] bg-primary/30 z-10 origin-bottom-left"
        style={{ transform: "rotate(-15deg) translateY(-80px)" }}
      />

      {/* Content */}
      <motion.div
        className="relative z-20 px-6 pb-12 md:px-10"
        style={{ opacity: contentOpacity }}
      >
        {/* YCL large type */}
        <motion.h1
          className="font-headline text-[100px] md:text-[120px] font-extrabold text-primary leading-none tracking-tight"
          initial={{ clipPath: "inset(0 100% 0 0)" }}
          animate={{ clipPath: "inset(0 0% 0 0)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          YCL
        </motion.h1>

        {/* Full name */}
        <motion.p
          className="text-sm md:text-base uppercase tracking-[0.25em] text-primary/70 font-bold mt-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Young Christian Lifestyle
        </motion.p>

        {/* Tagline */}
        <motion.p
          className="font-body text-2xl md:text-3xl text-on-surface-variant max-w-md leading-snug mt-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Le rendez-vous des jeunes chretiens
          <br />
          qui veulent vivre a fond.
        </motion.p>

        {/* Identity filter */}
        <motion.p
          className="text-sm uppercase tracking-[0.2em] text-on-surface-variant/70 font-bold mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          Ambitieux &middot; Determine &middot; Resource
        </motion.p>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">
          expand_more
        </span>
      </motion.div>
    </motion.section>
  );
}
