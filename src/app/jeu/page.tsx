"use client";

import { useState, useCallback } from "react";
import { QrScanner } from "@/components/qr-scanner";

export default function JeuPage() {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const handleScan = useCallback((data: string) => {
    setLastScan(data);
    setScanning(false);
    // TODO S3: Validate scan against Firestore, reveal word
  }, []);

  return (
    <div className="px-6 pt-6 max-w-2xl mx-auto">
      {/* Header */}
      <section className="mb-8">
        <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight mb-3">
          Chasse au Tresor
        </h1>
        <p className="text-on-surface-variant text-lg leading-relaxed">
          Scannez les QR codes pour dechiffrer la phrase mystere.
        </p>
      </section>

      {/* Phrase display placeholder */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 editorial-shadow mb-6">
        <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest mb-3">
          Phrase mystere
        </p>
        <div className="flex flex-wrap gap-2">
          {["___", "___", "___", "___", "___"].map((word, i) => (
            <span
              key={i}
              className="px-4 py-2 bg-surface-container-highest rounded-lg font-headline font-bold text-on-surface-variant/40"
            >
              {word}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm text-on-surface-variant">0/5 mots trouves</p>
      </div>

      {/* Scan button */}
      <button
        onClick={() => setScanning(true)}
        className="w-full py-4 rounded-full gradient-cta text-on-primary font-bold text-lg flex items-center justify-center gap-3 transition-all hover:opacity-90 active:scale-95"
      >
        <span className="material-symbols-outlined text-2xl">qr_code_scanner</span>
        Scanner un QR code
      </button>

      {/* Last scan result */}
      {lastScan && (
        <div className="mt-6 bg-secondary-container/50 rounded-2xl p-4">
          <p className="text-xs text-on-secondary-container font-bold uppercase tracking-widest mb-1">
            Dernier scan
          </p>
          <p className="text-sm text-on-secondary-container font-mono break-all">
            {lastScan}
          </p>
        </div>
      )}

      {/* QR Scanner overlay */}
      {scanning && (
        <QrScanner onScan={handleScan} onClose={() => setScanning(false)} />
      )}
    </div>
  );
}
