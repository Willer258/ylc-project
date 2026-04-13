"use client";

import { useAuthContext } from "@/components/auth-provider";
import { AnnouncementBanner } from "@/components/announcement-banner";
import { GuideMessage } from "@/components/guide-message";
import { TeamInfo } from "@/components/team-info";

export default function HomePage() {
  const { userName } = useAuthContext();

  return (
    <div className="px-4 md:px-8 pt-4">
      {/* Hero Section */}
      <section className="relative h-[65vh] min-h-[400px] w-full overflow-hidden rounded-3xl editorial-shadow">
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 via-on-surface/10 to-transparent z-10" />
        <div className="absolute inset-0 bg-primary/20" />
        {/* Placeholder gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-tertiary/30" />
        <div className="absolute bottom-0 left-0 p-8 md:p-16 w-full md:w-2/3 z-20">
          <h2 className="font-headline text-4xl md:text-6xl font-extrabold text-white leading-[1.1] mb-4 tracking-tight">
            Bienvenue, <br /> {userName || "explorateur"}
          </h2>
          <p className="text-white/90 text-lg max-w-xl leading-relaxed mb-6">
            L&apos;aventure spirituelle commence ici. Rejoins ton equipe et pars a la
            decouverte du message cache.
          </p>
          <a
            href="/jeu"
            className="inline-flex items-center gap-3 gradient-cta text-on-primary px-8 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all active:scale-95"
          >
            Commencer le voyage
            <span className="material-symbols-outlined">arrow_forward</span>
          </a>
        </div>
      </section>

      {/* Announcement Banner */}
      <AnnouncementBanner />

      {/* Guide Message */}
      <GuideMessage />

      {/* Team Info + Captain Vote */}
      <TeamInfo />

      {/* Narrative Section */}
      <section className="mt-16 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-block px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full text-sm font-bold tracking-widest uppercase">
              L&apos;Esprit YLC
            </div>
            <h3 className="font-headline text-3xl font-bold text-primary leading-tight">
              Une immersion totale entre ciel et terre.
            </h3>
            <p className="text-on-surface-variant text-lg leading-relaxed">
              Young Christian Life vous invite a vivre une experience unique. Scannez les
              QR codes dissemines dans le lieu, reconstituez le message cache et
              decouvrez ensemble une verite inspirante.
            </p>
          </div>
          {/* Journal Card */}
          <div className="relative">
            <div className="bg-surface-container-lowest p-6 rounded-3xl editorial-shadow transform rotate-2">
              <div className="rounded-xl overflow-hidden mb-4 h-40 bg-gradient-to-br from-secondary/20 to-tertiary/20" />
              <h4 className="font-headline text-xl font-bold text-primary mb-2">
                Notes de terrain
              </h4>
              <p className="text-sm text-on-surface-variant italic leading-relaxed">
                &ldquo;Car je connais les projets que j&apos;ai formes sur vous, dit
                l&apos;Eternel, projets de paix et non de malheur, afin de vous donner un
                avenir et de l&apos;esperance.&rdquo; — Jeremie 29:11
              </p>
            </div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-secondary-container rounded-full opacity-30 blur-2xl -z-10" />
          </div>
        </div>
      </section>

      {/* Theme Grid */}
      <section className="mt-20 max-w-5xl mx-auto mb-8">
        <h3 className="font-headline text-2xl font-bold text-on-surface mb-8">
          Explorez par theme
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-auto md:h-[300px]">
          {[
            { label: "Equipe", icon: "groups", span: "col-span-2 row-span-2" },
            { label: "Chasse au tresor", icon: "qr_code_scanner", span: "col-span-1" },
            { label: "Programme", icon: "event_note", span: "col-span-1" },
            { label: "Photos", icon: "photo_camera", span: "col-span-1" },
            { label: "Avis", icon: "reviews", span: "col-span-1" },
          ].map((item) => (
            <div
              key={item.label}
              className={`${item.span} relative group cursor-pointer overflow-hidden rounded-3xl bg-surface-container`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-500" />
              <div className="absolute bottom-4 left-4 flex flex-col gap-1">
                <span className="material-symbols-outlined text-primary text-2xl">
                  {item.icon}
                </span>
                <h5 className="text-lg font-bold text-on-surface">{item.label}</h5>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
