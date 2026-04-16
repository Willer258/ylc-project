"use client";

import { useAuthContext } from "@/components/auth-provider";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { GuideMessage } from "@/components/guide-message";
import { TeamInfo } from "@/components/team-info";
import { HeroIdentity } from "@/components/home/HeroIdentity";
import { PillarCarousel } from "@/components/home/PillarCarousel";
import { SocialProof } from "@/components/home/SocialProof";
import { ScarcityBanner } from "@/components/home/ScarcityBanner";
import { OrganizedBy } from "@/components/home/OrganizedBy";
import { QuickLinks } from "@/components/home/QuickLinks";
import { FinalCTA } from "@/components/home/FinalCTA";
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

export default function HomePage() {
  const { userName } = useAuthContext();
  const [heroPhoto, setHeroPhoto] = useState<string | undefined>();

  // Fetch best photo for hero background
  useEffect(() => {
    const q = query(
      collection(db, "events", EVENT_ID, "photos"),
      orderBy("uploadedAt", "desc"),
      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      const doc = snap.docs.find(
        (d) => d.data().isVisible !== false && d.data().imageUrl
      );
      setHeroPhoto(doc ? (doc.data().imageUrl as string) : undefined);
    });
    return unsub;
  }, []);

  return (
    <div className="pb-4">
      {/* Sticky announcement bar */}
      <div className="sticky top-0 z-50">
        <AnnouncementBanner />
      </div>

      {/* 1. IDENTITÉ — Hero full bleed */}
      <HeroIdentity backgroundImage={heroPhoto} />

      {/* 2. VALEUR — Les 4 piliers */}
      <PillarCarousel />

      {/* 3. CRÉDIBILITÉ — Preuve sociale */}
      <SocialProof />

      {/* 4. RARETÉ — Le déclencheur */}
      <ScarcityBanner />

      {/* 5. ORGANISATEUR — Par Violies */}
      <OrganizedBy />

      {/* 6. ACCÈS RAPIDE — Quick links */}
      <QuickLinks />

      {/* Contextual: Guide + Team (shown when relevant) */}
      <div className="px-2 mt-2 space-y-3">
        <GuideMessage />
        <TeamInfo />
      </div>

      {/* 7. ACTION — CTA final */}
      <FinalCTA userName={userName} />
    </div>
  );
}
