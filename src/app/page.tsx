"use client";

import { useAuthContext } from "@/components/auth-provider";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { GuideMessage } from "@/components/guide-message";
import { TeamInfo } from "@/components/team-info";
import Link from "next/link";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function HomePage() {
  const { userName } = useAuthContext();
  const heroRef = useRef<HTMLElement>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [currentPhoto, setCurrentPhoto] = useState(0);

  // Fetch gallery photos in real-time
  useEffect(() => {
    const q = query(
      collection(db, "events", EVENT_ID, "photos"),
      orderBy("uploadedAt", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, (snap) => {
      const urls = snap.docs
        .filter((d) => d.data().isVisible !== false && d.data().imageUrl)
        .map((d) => d.data().imageUrl as string);
      setGalleryPhotos(urls);
    });
    return unsub;
  }, []);

  // Auto-rotate photos
  useEffect(() => {
    if (galleryPhotos.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentPhoto((c) => (c + 1) % galleryPhotos.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [galleryPhotos.length]);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroBgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  const QUICK_LINKS = [
    { label: "Programme", icon: "event_note", href: "/aventure", color: "from-primary/15 to-primary-container/15" },
    { label: "Jeu", icon: "qr_code_scanner", href: "/jeu", color: "from-secondary/15 to-secondary-container/15" },
    { label: "Photos", icon: "photo_camera", href: "/photos", color: "from-tertiary/15 to-tertiary-container/15" },
    { label: "Avis", icon: "reviews", href: "/avis", color: "from-primary-fixed-dim/15 to-primary/15" },
  ];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="pb-4"
    >
      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className="relative h-[55vh] min-h-[360px] max-h-[480px] w-[calc(100%-2rem)] mx-auto overflow-hidden rounded-3xl"
        variants={scaleIn}
        style={{ scale: heroScale, opacity: heroOpacity }}
      >
        {/* Background: gallery slideshow or fallback gradient */}
        {galleryPhotos.length > 0 ? (
          <>
            <AnimatePresence mode="popLayout">
              <motion.img
                key={galleryPhotos[currentPhoto]}
                src={galleryPhotos[currentPhoto]}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
                style={{ y: heroBgY }}
              />
            </AnimatePresence>
          </>
        ) : (
          <>
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary/40 via-secondary/20 to-tertiary/30"
              style={{ y: heroBgY }}
            />
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  "radial-gradient(circle at 20% 80%, rgba(130,81,29,0.3) 0%, transparent 60%)",
                  "radial-gradient(circle at 80% 20%, rgba(85,99,67,0.3) 0%, transparent 60%)",
                  "radial-gradient(circle at 20% 80%, rgba(130,81,29,0.3) 0%, transparent 60%)",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-on-surface/30 to-on-surface/10 z-10" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full z-20">
          <motion.div
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-secondary"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            En direct
          </motion.div>

          <motion.h2
            className="font-headline text-3xl md:text-5xl font-extrabold text-white leading-[1.08] mb-3 tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            Bienvenue,{" "}
            <motion.span
              className="text-primary-fixed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              {userName || "explorateur"}
            </motion.span>
          </motion.h2>

          <motion.p
            className="text-white/75 text-sm md:text-base max-w-sm leading-relaxed mb-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Pars a la decouverte du message cache avec ton equipe.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link
              href="/jeu"
              className="inline-flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-full font-bold text-sm hover:bg-white/90 transition-all active:scale-95"
            >
              Commencer
              <motion.span
                className="material-symbols-outlined text-lg"
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                arrow_forward
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* Quick Links */}
      <motion.section className="px-4 mt-5" variants={fadeUp}>
        <div className="grid grid-cols-4 gap-2.5">
          {QUICK_LINKS.map((link, i) => (
            <motion.div
              key={link.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + i * 0.08 }}
            >
              <Link href={link.href}>
                <motion.div
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl bg-gradient-to-br ${link.color}`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="material-symbols-outlined text-primary text-xl">
                    {link.icon}
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant">
                    {link.label}
                  </span>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Announcement */}
      <motion.div variants={fadeUp} className="px-2 mt-4">
        <AnnouncementBanner />
      </motion.div>

      {/* Guide */}
      <motion.div variants={fadeUp} className="px-2 mt-2">
        <GuideMessage />
      </motion.div>

      {/* Team Info */}
      <motion.div variants={fadeUp} className="px-2 mt-3">
        <TeamInfo />
      </motion.div>

      {/* Narrative Section */}
      <motion.section className="mt-10 px-5" variants={fadeUp}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="inline-block px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold tracking-widest uppercase">
              L&apos;Esprit YCL
            </div>
            <h3 className="font-headline text-2xl font-bold text-primary leading-tight">
              Une immersion totale entre ciel et terre.
            </h3>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Scannez les QR codes, reconstituez le message cache et decouvrez
              ensemble une verite inspirante.
            </p>
          </div>

          {/* Journal Card */}
          <motion.div
            className="relative"
            whileHover={{ rotate: 0 }}
            initial={{ rotate: 2 }}
          >
            <motion.div
              className="bg-surface-container-lowest p-5 rounded-2xl editorial-shadow"
              whileHover={{ y: -6, boxShadow: "0 24px 48px -12px rgba(29,27,25,0.08)" }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="rounded-lg overflow-hidden mb-3 h-28 bg-gradient-to-br from-secondary/15 to-tertiary/15 flex items-center justify-center">
                <motion.span
                  className="material-symbols-outlined text-4xl text-secondary/30"
                  animate={{ rotateY: [0, 180, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  auto_stories
                </motion.span>
              </div>
              <h4 className="font-headline text-base font-bold text-primary mb-1.5">
                Notes de terrain
              </h4>
              <p className="text-xs text-on-surface-variant italic leading-relaxed">
                &ldquo;Car je connais les projets que j&apos;ai formes sur vous,
                dit l&apos;Eternel, projets de paix et non de malheur, afin de
                vous donner un avenir et de l&apos;esperance.&rdquo;
              </p>
              <p className="text-[11px] text-primary/50 font-bold mt-1.5">— Jeremie 29:11</p>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>
    </motion.div>
  );
}
