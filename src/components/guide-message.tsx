"use client";

import { useAuthContext } from "@/components/auth-provider";

export function GuideMessage() {
  const { teamId } = useAuthContext();

  // Determine guide state based on user progress
  let message: string;
  let icon: string;

  if (!teamId) {
    message = "Bienvenue dans l'aventure ! Rejoins une equipe pour commencer.";
    icon = "waving_hand";
  } else {
    message = "Ton equipe est prete ! Explorez le lieu et scannez les QR codes.";
    icon = "explore";
  }

  return (
    <div className="mt-6 mx-auto max-w-4xl">
      <div className="bg-secondary-container/50 rounded-2xl px-6 py-4 flex items-start gap-4">
        <span className="material-symbols-outlined text-secondary text-xl mt-0.5 shrink-0">
          {icon}
        </span>
        <p className="text-on-secondary-container text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
