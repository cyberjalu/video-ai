import type React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../lib/cn";

type ToastVariant = "default" | "success" | "error";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = { id, ...t };
    setItems((prev) => [item, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3600);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-5 top-5 z-50 flex w-[360px] max-w-[calc(100vw-40px)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className={cn(
                "pointer-events-auto relative overflow-hidden rounded-[22px] border px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl",
                t.variant === "success"
                  ? "border-emerald-400/20 bg-[linear-gradient(180deg,rgba(64,211,159,0.18),rgba(64,211,159,0.08))]"
                  : t.variant === "error"
                    ? "border-red-400/20 bg-[linear-gradient(180deg,rgba(241,111,114,0.18),rgba(241,111,114,0.08))]"
                    : "border-white/10 bg-[linear-gradient(180deg,rgba(20,23,29,0.92),rgba(12,14,18,0.92))]",
              )}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/35 to-transparent" />
              <div className="eyebrow-label mb-1">{t.variant === "success" ? "Success" : t.variant === "error" ? "Alert" : "System"}</div>
              <div className="text-sm font-semibold text-zinc-100">{t.title}</div>
              {t.description ? <div className="mt-1 text-sm leading-6 text-zinc-300">{t.description}</div> : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

