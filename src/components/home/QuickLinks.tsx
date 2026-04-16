"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const LINKS = [
  { label: "Programme", icon: "calendar_today", href: "/aventure" },
  { label: "Jeu", icon: "stadia_controller", href: "/jeu" },
  { label: "Photos", icon: "photo_library", href: "/photos" },
  { label: "Avis", icon: "rate_review", href: "/avis" },
];

export function QuickLinks() {
  return (
    <motion.section
      className="py-8 px-6"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {LINKS.map((link, i) => (
          <motion.div
            key={link.label}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <Link href={link.href}>
              <motion.div
                className="flex flex-col items-center gap-2 py-5 rounded-2xl bg-surface-container transition-colors"
                whileHover={{ scale: 1.03, y: -2, backgroundColor: "var(--color-primary-container, #9e6933)" }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="material-symbols-outlined text-[32px] text-primary">
                  {link.icon}
                </span>
                <span className="text-sm font-semibold text-on-surface-variant">
                  {link.label}
                </span>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
