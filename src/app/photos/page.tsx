"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthContext } from "@/components/auth-provider";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
  type PanInfo,
} from "framer-motion";

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "stack">("grid");
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
      setLoading(false);
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
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ylc_unsigned";

      if (!cloudName) {
        // Fallback: store as base64 in Firestore (dev mode)
        const reader = new FileReader();
        reader.onload = async () => {
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
              teamName: teamId,
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
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", `ylc/${EVENT_ID}`);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      const imageUrl = data.secure_url;

      // Save reference in Firestore
      await addDoc(collection(db, "events", EVENT_ID, "photos"), {
        teamId,
        teamName: teamId,
        uploaderUid: uuid,
        uploaderName: userName,
        imageUrl,
        cloudinaryPublicId: data.public_id,
        uploadedAt: serverTimestamp(),
        isVisible: true,
      });
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.section
        className="mb-6 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-end justify-between mb-3">
          <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight">
            Photos
          </h1>
          {!loading && photos.length > 0 && (
            <motion.div
              className="flex gap-1 bg-surface-container rounded-full p-1"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === "grid" ? "bg-primary text-on-primary" : "text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-lg">grid_view</span>
              </button>
              <button
                onClick={() => setViewMode("stack")}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === "stack" ? "bg-primary text-on-primary" : "text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-lg">view_carousel</span>
              </button>
            </motion.div>
          )}
        </div>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Les meilleurs moments de la soiree, en direct.
        </p>
        {!loading && photos.length > 0 && (
          <motion.div
            className="mt-3 inline-flex items-center gap-2 bg-secondary-container/50 text-on-secondary-container px-4 py-1.5 rounded-full text-sm font-semibold"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
              photo_library
            </span>
            {photos.length} photo{photos.length > 1 ? "s" : ""}
          </motion.div>
        )}
      </motion.section>

      {/* Loading State */}
      {loading ? (
        <LoadingSkeleton />
      ) : photos.length > 0 ? (
        <>
          {/* Featured Carousel (latest 5) */}
          <FeaturedCarousel
            photos={photos.slice(0, 5)}
            getRelativeTime={getRelativeTime}
            onSelect={(i) => setSelectedIndex(i)}
          />

          {/* View Modes */}
          <div className="px-6 mt-8">
            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <GridView
                  key="grid"
                  photos={photos}
                  getRelativeTime={getRelativeTime}
                  onSelect={setSelectedIndex}
                />
              ) : (
                <StackView
                  key="stack"
                  photos={photos}
                  getRelativeTime={getRelativeTime}
                />
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <EmptyState />
      )}

      {/* Lightbox Carousel */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <LightboxCarousel
            photos={photos}
            initialIndex={selectedIndex}
            getRelativeTime={getRelativeTime}
            onClose={() => setSelectedIndex(null)}
          />
        )}
      </AnimatePresence>

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
      <motion.button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full gradient-cta text-on-primary shadow-2xl flex items-center justify-center z-40 disabled:opacity-50"
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.85 }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.5 }}
      >
        {uploading ? (
          <motion.div
            className="w-6 h-6 rounded-full border-2 border-white border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          />
        ) : (
          <span className="material-symbols-outlined text-2xl">add_a_photo</span>
        )}
      </motion.button>
    </div>
  );
}

/* ===== FEATURED CAROUSEL ===== */
function FeaturedCarousel({
  photos,
  getRelativeTime,
  onSelect,
}: {
  photos: Photo[];
  getRelativeTime: (d: Date) => string;
  onSelect: (i: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const dragX = useMotionValue(0);

  function handleDragEnd(_: unknown, info: PanInfo) {
    const threshold = 50;
    if (info.offset.x < -threshold && current < photos.length - 1) {
      setCurrent(current + 1);
    } else if (info.offset.x > threshold && current > 0) {
      setCurrent(current - 1);
    }
  }

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % photos.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [photos.length]);

  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex px-6 gap-4"
        drag="x"
        dragConstraints={{ left: -(photos.length - 1) * 300, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        animate={{ x: -current * 310 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id}
            className="relative shrink-0 w-[280px] h-[360px] rounded-3xl overflow-hidden cursor-pointer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: i === current ? 1 : 0.92,
            }}
            transition={{ duration: 0.4 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(i)}
          >
            <img
              src={photo.imageUrl}
              alt={`Photo par ${photo.uploaderName}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <motion.div
              className="absolute bottom-0 left-0 right-0 p-5"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: i === current ? 1 : 0.6 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-white font-headline font-bold text-lg">{photo.uploaderName}</p>
              <p className="text-white/60 text-xs mt-1">{getRelativeTime(photo.uploadedAt)}</p>
            </motion.div>

            {/* Shine effect on active */}
            {i === current && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.5, delay: 0.3 }}
              />
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {photos.map((_, i) => (
          <motion.button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full bg-primary"
            animate={{
              width: i === current ? 24 : 8,
              opacity: i === current ? 1 : 0.3,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ height: 8 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ===== GRID VIEW ===== */
function GridView({
  photos,
  getRelativeTime,
  onSelect,
}: {
  photos: Photo[];
  getRelativeTime: (d: Date) => string;
  onSelect: (i: number) => void;
}) {
  return (
    <motion.div
      className="grid grid-cols-2 gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence mode="popLayout">
        {photos.map((photo, index) => (
          <motion.div
            key={photo.id}
            layout
            initial={{ opacity: 0, scale: 0.7, rotateZ: index % 2 === 0 ? -3 : 3 }}
            animate={{ opacity: 1, scale: 1, rotateZ: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{
              duration: 0.5,
              delay: index < 8 ? index * 0.06 : 0,
              type: "spring",
              stiffness: 260,
              damping: 22,
            }}
            whileHover={{
              scale: 1.05,
              y: -6,
              rotateZ: index % 2 === 0 ? 1 : -1,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.93 }}
            onClick={() => onSelect(index)}
            className="relative rounded-2xl overflow-hidden bg-surface-container aspect-square cursor-pointer"
          >
            <img
              src={photo.imageUrl}
              alt={`Photo par ${photo.uploaderName}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.06 }}
            >
              <p className="text-white text-xs font-bold">{photo.uploaderName}</p>
              <p className="text-white/70 text-[10px]">{getRelativeTime(photo.uploadedAt)}</p>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

/* ===== STACK VIEW (Tinder-like cards) ===== */
function StackView({
  photos,
  getRelativeTime,
}: {
  photos: Photo[];
  getRelativeTime: (d: Date) => string;
}) {
  const [stack, setStack] = useState(photos);
  const [gone, setGone] = useState(new Set<string>());

  useEffect(() => {
    setStack(photos.filter((p) => !gone.has(p.id)));
  }, [photos, gone]);

  function handleSwipe(photoId: string) {
    setGone((prev) => new Set(prev).add(photoId));
  }

  function handleReset() {
    setGone(new Set());
  }

  if (stack.length === 0) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <p className="text-on-surface-variant mb-4">Vous avez vu toutes les photos !</p>
        <motion.button
          onClick={handleReset}
          className="px-6 py-3 rounded-full gradient-cta text-on-primary font-bold"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Revoir depuis le debut
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="relative h-[400px] flex items-center justify-center">
      <AnimatePresence>
        {stack.slice(0, 3).map((photo, i) => (
          <SwipeCard
            key={photo.id}
            photo={photo}
            index={i}
            getRelativeTime={getRelativeTime}
            onSwipe={() => handleSwipe(photo.id)}
          />
        ))}
      </AnimatePresence>
      <p className="absolute bottom-0 text-on-surface-variant/50 text-xs">
        Glissez pour voir la suivante
      </p>
    </div>
  );
}

function SwipeCard({
  photo,
  index,
  getRelativeTime,
  onSwipe,
}: {
  photo: Photo;
  index: number;
  getRelativeTime: (d: Date) => string;
  onSwipe: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const scale = useSpring(1 - index * 0.05, { stiffness: 300, damping: 20 });

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 120) {
      onSwipe();
    }
  }

  return (
    <motion.div
      className="absolute w-[280px] h-[370px] rounded-3xl overflow-hidden editorial-shadow cursor-grab active:cursor-grabbing"
      style={{
        x,
        rotate,
        opacity,
        scale,
        zIndex: 3 - index,
      }}
      initial={{
        scale: 0.8,
        y: 40,
        opacity: 0,
      }}
      animate={{
        scale: 1 - index * 0.05,
        y: index * 12,
        opacity: 1,
      }}
      exit={{
        x: x.get() > 0 ? 300 : -300,
        opacity: 0,
        rotate: x.get() > 0 ? 20 : -20,
        transition: { duration: 0.3 },
      }}
      drag={index === 0 ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <img
        src={photo.imageUrl}
        alt={`Photo par ${photo.uploaderName}`}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="text-white font-headline font-bold text-xl">{photo.uploaderName}</p>
        <p className="text-white/60 text-sm mt-1">{getRelativeTime(photo.uploadedAt)}</p>
      </div>
    </motion.div>
  );
}

/* ===== LIGHTBOX CAROUSEL ===== */
function LightboxCarousel({
  photos,
  initialIndex,
  getRelativeTime,
  onClose,
}: {
  photos: Photo[];
  initialIndex: number;
  getRelativeTime: (d: Date) => string;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const [[direction, isAnimating], setDirection] = useState([0, false]);

  function navigate(dir: number) {
    if (isAnimating) return;
    const next = current + dir;
    if (next < 0 || next >= photos.length) return;
    setDirection([dir, true]);
    setCurrent(next);
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -80) navigate(1);
    else if (info.offset.x > 80) navigate(-1);
  }

  const photo = photos[current];

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 400 : -400,
      opacity: 0,
      scale: 0.85,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -400 : 400,
      opacity: 0,
      scale: 0.85,
    }),
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-on-surface/95"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      {/* Header */}
      <div className="relative z-10 flex justify-between items-center px-6 py-4">
        <button onClick={onClose} className="text-white/80 hover:text-white">
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>
        <span className="text-white/60 text-sm font-bold">
          {current + 1} / {photos.length}
        </span>
        <div className="w-8" />
      </div>

      {/* Photo */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 overflow-hidden">
        <AnimatePresence custom={direction} mode="popLayout" onExitComplete={() => setDirection([0, false])}>
          <motion.div
            key={photo.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            onDragEnd={handleDragEnd}
            className="w-full max-w-lg rounded-3xl overflow-hidden editorial-shadow"
          >
            <img
              src={photo.imageUrl}
              alt={`Photo par ${photo.uploaderName}`}
              className="w-full max-h-[60vh] object-contain bg-black"
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {current > 0 && (
          <motion.button
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur-sm"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </motion.button>
        )}
        {current < photos.length - 1 && (
          <motion.button
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center backdrop-blur-sm"
            onClick={() => navigate(1)}
            whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </motion.button>
        )}
      </div>

      {/* Info bar */}
      <motion.div
        className="relative z-10 px-6 py-5"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <p className="text-white font-headline font-bold text-lg">{photo.uploaderName}</p>
        <p className="text-white/50 text-sm">{getRelativeTime(photo.uploadedAt)}</p>
      </motion.div>

      {/* Thumbnail strip */}
      <div className="relative z-10 px-4 pb-6">
        <div className="flex gap-2 overflow-x-auto no-scrollbar justify-center">
          {photos.map((p, i) => (
            <motion.button
              key={p.id}
              onClick={() => { setDirection([i > current ? 1 : -1, false]); setCurrent(i); }}
              className="shrink-0 rounded-xl overflow-hidden"
              animate={{
                width: i === current ? 56 : 40,
                height: i === current ? 56 : 40,
                opacity: i === current ? 1 : 0.5,
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              whileHover={{ opacity: 0.8, scale: 1.1 }}
            >
              <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ===== EMPTY STATE ===== */
/* ===== LOADING SKELETON ===== */
function LoadingSkeleton() {
  return (
    <div className="px-6">
      {/* Carousel skeleton */}
      <div className="flex gap-4 overflow-hidden mb-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="shrink-0 w-[280px] h-[360px] rounded-3xl bg-surface-container-highest/60"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-2xl bg-surface-container-highest/60"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>

      {/* Loading text */}
      <motion.p
        className="text-center text-on-surface-variant/50 text-sm mt-6"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Chargement des photos...
      </motion.p>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      className="text-center py-20 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <motion.div
        className="relative inline-block mb-6"
        animate={{
          y: [0, -8, 0],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="material-symbols-outlined text-6xl text-primary/30">
          photo_camera
        </span>
        <motion.span
          className="absolute -top-1 -right-1 material-symbols-outlined text-xl text-secondary"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 15, -15, 0],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >
          add_circle
        </motion.span>
      </motion.div>
      <p className="text-on-surface-variant text-lg">
        Aucune photo pour le moment.
      </p>
      <p className="text-on-surface-variant/60 text-sm mt-2">
        Appuyez sur le bouton pour capturer un souvenir !
      </p>
    </motion.div>
  );
}
