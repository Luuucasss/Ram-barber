"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "bad" | "warn";
type Toast = { id: number; message: string; tone: Tone; leaving: boolean };
type Push = (message: string, tone?: Tone) => void;

const ToastContext = createContext<Push>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const VISIBLE_MS = 3200;
const EXIT_MS = 160;

/**
 * Minimal toast stack for admin screens. Enter uses @starting-style (CSS transition, so a burst
 * of toasts retargets smoothly instead of restarting keyframes); exit is faster than enter.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      later(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT_MS);
    },
    [later],
  );

  const push = useCallback<Push>(
    (message, tone = "ok") => {
      const id = ++seq.current;
      setToasts((list) => [...list.slice(-2), { id, message, tone, leaving: false }]);
      later(() => dismiss(id), tone === "ok" ? VISIBLE_MS : VISIBLE_MS * 1.8);
    },
    [dismiss, later],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === "bad" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl border bg-card-2/95 px-4 py-3 text-sm text-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur",
              "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-3 starting:opacity-0",
              t.tone === "ok" && "border-line-strong",
              t.tone === "bad" && "border-bad/50",
              t.tone === "warn" && "border-warn/50",
              t.leaving && "translate-y-2 opacity-0 duration-150",
            )}
          >
            {t.tone === "ok" && <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />}
            {t.tone === "bad" && <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" aria-hidden="true" />}
            {t.tone === "warn" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
