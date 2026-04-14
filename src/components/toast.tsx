"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type ToastType = "success" | "info" | "warning";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: "check_circle",
  info: "info",
  warning: "warning",
};

const TOAST_COLORS: Record<ToastType, { bg: string; icon: string; text: string }> = {
  success: {
    bg: "bg-green-500/10 border-green-500/20",
    icon: "text-green-600",
    text: "text-green-800",
  },
  info: {
    bg: "bg-primary/10 border-primary/20",
    icon: "text-primary",
    text: "text-on-surface",
  },
  warning: {
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: "text-amber-600",
    text: "text-amber-800",
  },
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  function ToastContainer() {
    return (
      <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const colors = TOAST_COLORS[toast.type];
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`w-full max-w-sm rounded-2xl border px-4 py-3 editorial-shadow pointer-events-auto flex items-center gap-3 ${colors.bg}`}
                onClick={() => dismissToast(toast.id)}
              >
                <span className={`material-symbols-outlined text-xl shrink-0 ${colors.icon}`}>
                  {TOAST_ICONS[toast.type]}
                </span>
                <p className={`text-sm font-bold flex-1 ${colors.text}`}>
                  {toast.message}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    );
  }

  return { showToast, ToastContainer };
}
