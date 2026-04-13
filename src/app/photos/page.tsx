"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";

const EVENT_ID = "event-default";

interface Photo {
  id: string;
  teamName: string;
  uploaderName: string;
  imageUrl: string;
  uploadedAt: Date;
}

export default function PhotosPage() {
  const { uuid, userName, teamId } = useAuthContext();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "events", EVENT_ID, "photos"),
      orderBy("uploadedAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      setPhotos(
        snap.docs
          .filter((d) => d.data().isVisible !== false)
          .map((d) => ({
            id: d.id,
            teamName: d.data().teamName || "Equipe inconnue",
            uploaderName: d.data().uploaderName || "Anonyme",
            imageUrl: d.data().imageUrl || d.data().storageUrl || "",
            uploadedAt: d.data().uploadedAt?.toDate?.() || new Date(),
          }))
      );
    });

    return unsub;
  }, []);

  function getRelativeTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "a l'instant";
    if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
    return `il y a ${Math.floor(diff / 86400)}j`;
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !teamId) return;

    setUploading(true);
    try {
      // Convert to base64 data URL (temporary solution without Firebase Storage)
      const reader = new FileReader();
      reader.onload = async () => {
        // Compress by drawing to canvas
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const maxSize = 800;
          let w = img.width;
          let h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = (h / w) * maxSize; w = maxSize; }
            else { w = (w / h) * maxSize; h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
          const compressedUrl = canvas.toDataURL("image/jpeg", 0.7);

          await addDoc(collection(db, "events", EVENT_ID, "photos"), {
            teamId,
            teamName: teamId, // Will be replaced with real team name later
            uploaderUid: uuid,
            uploaderName: userName,
            imageUrl: compressedUrl,
            uploadedAt: serverTimestamp(),
            isVisible: true,
          });

          setUploading(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload error:", err);
      setUploading(false);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="px-6 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <section className="mb-8">
        <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight mb-3">
          Photos
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Les meilleurs moments de la soiree, en direct.
        </p>
      </section>

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative rounded-2xl overflow-hidden bg-surface-container aspect-square">
              <img
                src={photo.imageUrl}
                alt={`Photo par ${photo.uploaderName}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <p className="text-white text-xs font-bold">{photo.uploaderName}</p>
                <p className="text-white/70 text-[10px]">{getRelativeTime(photo.uploadedAt)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 block mb-3">
            photo_camera
          </span>
          <p className="text-on-surface-variant">
            Aucune photo pour le moment.
            <br />
            Soyez les premiers a capturer un souvenir !
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Floating upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full gradient-cta text-on-primary shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform disabled:opacity-50"
      >
        {uploading ? (
          <div className="w-6 h-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
        ) : (
          <span className="material-symbols-outlined text-2xl">add_a_photo</span>
        )}
      </button>
    </div>
  );
}
