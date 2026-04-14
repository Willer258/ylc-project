"use client";

import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const EVENT_ID = "event-default";

interface Photo {
  id: string;
  uploaderName: string;
  teamName: string;
  imageUrl: string;
  isVisible: boolean;
}

export default function AdminPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "events", EVENT_ID, "photos"),
      orderBy("uploadedAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setPhotos(
        snap.docs.map((d) => ({
          id: d.id,
          uploaderName: d.data().uploaderName || "Anonyme",
          teamName: d.data().teamName || "—",
          imageUrl: d.data().imageUrl || "",
          isVisible: d.data().isVisible !== false,
        }))
      );
    });
    return unsub;
  }, []);

  async function handleToggle(photoId: string, currentVisible: boolean) {
    await updateDoc(doc(db, "events", EVENT_ID, "photos", photoId), {
      isVisible: !currentVisible,
    });
  }

  async function handleDelete(photoId: string) {
    if (!confirm("Supprimer definitivement cette photo ?")) return;
    await deleteDoc(doc(db, "events", EVENT_ID, "photos", photoId));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Photos ({photos.length})</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`relative rounded-xl overflow-hidden bg-white/5 ${
              !photo.isVisible ? "opacity-40" : ""
            }`}
          >
            <img
              src={photo.imageUrl}
              alt=""
              className="w-full aspect-square object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-3">
              <p className="text-white text-xs font-bold">{photo.uploaderName}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleToggle(photo.id, photo.isVisible)}
                  className="text-xs px-2 py-1 rounded bg-white/10 text-white/70 hover:bg-white/20"
                >
                  {photo.isVisible ? "Masquer" : "Afficher"}
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {photos.length === 0 && (
        <div className="text-center py-16 text-white/30">Aucune photo.</div>
      )}
    </div>
  );
}
