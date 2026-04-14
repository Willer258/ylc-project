"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "events", EVENT_ID, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setReviews(
        snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Anonyme",
          rating: d.data().rating || 0,
          comment: d.data().comment || "",
        }))
      );
    });
    return unsub;
  }, []);

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Avis ({reviews.length})</h1>
        <div className="bg-amber-500/10 text-amber-400 px-4 py-2 rounded-xl font-bold">
          Moyenne : {avgRating} / 5
        </div>
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="bg-white/5 border border-white/5 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-white">{review.name}</p>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`material-symbols-outlined text-sm ${
                      star <= review.rating ? "text-amber-400" : "text-white/10"
                    }`}
                    style={star <= review.rating ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    star
                  </span>
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-sm text-white/50">{review.comment}</p>
            )}
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-16 text-white/30">Aucun avis.</div>
        )}
      </div>
    </div>
  );
}
