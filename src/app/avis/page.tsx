"use client";

import { useState, type FormEvent } from "react";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";

const EVENT_ID = "event-default";

export default function AvisPage() {
  const { uuid, userName } = useAuthContext();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0 || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Check if already submitted
      const existing = await getDocs(
        query(
          collection(db, "events", EVENT_ID, "reviews"),
          where("deviceUUID", "==", uuid)
        )
      );

      if (!existing.empty) {
        setError("Tu as deja laisse un avis. Merci !");
        setSubmitted(true);
        setLoading(false);
        return;
      }

      await addDoc(collection(db, "events", EVENT_ID, "reviews"), {
        deviceUUID: uuid,
        name: userName,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Review error:", err);
      setError("Erreur lors de l'envoi. Reessaie.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="px-6 pt-6 max-w-lg mx-auto">
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-6xl text-secondary mb-4 block">
            favorite
          </span>
          <h1 className="font-headline text-3xl font-extrabold text-primary mb-3">
            Merci !
          </h1>
          <p className="text-on-surface-variant text-lg">
            Ton avis a ete enregistre. Il nous aidera a ameliorer les prochains evenements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <section className="mb-8">
        <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight mb-3">
          Ton Avis
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Comment s&apos;est passee la soiree ? Ton retour compte pour nous.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Star Rating */}
        <div>
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">
            Note globale
          </p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= (hoverRating || rating);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <span
                    className={`material-symbols-outlined text-4xl ${
                      active ? "text-primary" : "text-outline-variant"
                    }`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    star
                  </span>
                </button>
              );
            })}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-on-surface-variant mt-2">
              {["", "Pas top", "Moyen", "Bien", "Tres bien", "Exceptionnel"][rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <div>
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-3">
            Un commentaire ? (optionnel)
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ce que tu as aime, ce qu'on pourrait ameliorer..."
            rows={4}
            maxLength={500}
            className="w-full px-5 py-4 rounded-xl bg-surface-container-highest text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-colors resize-none"
          />
          <p className="text-right text-xs text-on-surface-variant/50 mt-1">
            {comment.length}/500
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={rating === 0 || loading}
          className="w-full py-4 rounded-full gradient-cta text-on-primary font-bold text-lg transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loading ? "Envoi en cours..." : "Envoyer mon avis"}
        </button>
      </form>

      {/* Editorial quote */}
      <div className="mt-16 text-center px-4 pb-8">
        <span className="material-symbols-outlined text-3xl text-primary/20 mb-3 block">
          format_quote
        </span>
        <blockquote className="text-xl font-bold italic text-tertiary-container leading-tight mb-3">
          &ldquo;Chaque retour est une graine plantee pour un meilleur demain.&rdquo;
        </blockquote>
      </div>
    </div>
  );
}
