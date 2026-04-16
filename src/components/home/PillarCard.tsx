"use client";

import { motion } from "framer-motion";

interface PillarCardProps {
  icon: string;
  title: string;
  description: string;
  index: number;
}

export function PillarCard({ icon, title, description, index }: PillarCardProps) {
  return (
    <motion.div
      className="flex-shrink-0 w-[85vw] md:w-[75vw] max-w-[400px] snap-start"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
    >
      <motion.div
        className="h-[280px] bg-surface-container rounded-2xl p-8 flex flex-col justify-between shadow-md"
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div>
          <div className="w-16 h-16 rounded-2xl bg-primary-container/15 flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-[40px] text-primary font-bold">
              {icon}
            </span>
          </div>
          <h3 className="font-headline text-xl font-bold text-on-surface mb-2">
            {title}
          </h3>
        </div>
        <p className="font-body text-base text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </motion.div>
    </motion.div>
  );
}
