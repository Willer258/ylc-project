"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (!mounted || !scannerRef.current) return;

        const scanner = new Html5Qrcode("qr-reader");
        html5QrCodeRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
            scanner.stop().catch(() => {});
          },
          () => {} // ignore scan failures
        );
      } catch (err) {
        if (mounted) {
          setError(
            "Camera inaccessible. Verifiez les permissions ou utilisez la saisie manuelle."
          );
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  const handleManualSubmit = useCallback(() => {
    const trimmed = manualCode.trim();
    if (trimmed) {
      onScan(trimmed);
    }
  }, [manualCode, onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-on-surface/90 flex flex-col items-center justify-center px-6">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-white/80 hover:text-white"
      >
        <span className="material-symbols-outlined text-3xl">close</span>
      </button>

      <h2 className="font-headline text-xl font-bold text-white mb-6">
        Scanner un QR code
      </h2>

      {/* Scanner area */}
      <div
        id="qr-reader"
        ref={scannerRef}
        className="w-full max-w-sm rounded-2xl overflow-hidden bg-black"
        style={{ minHeight: 300 }}
      />

      {/* Error + manual fallback */}
      {error && (
        <div className="mt-6 w-full max-w-sm space-y-4">
          <p className="text-white/70 text-sm text-center">{error}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Entrer le code manuellement"
              className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
              className="px-4 py-3 rounded-xl gradient-cta text-on-primary font-bold disabled:opacity-50"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <p className="mt-6 text-white/50 text-xs text-center">
        Pointez la camera vers un QR code
      </p>
    </div>
  );
}
