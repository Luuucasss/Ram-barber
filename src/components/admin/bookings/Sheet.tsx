"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const EXIT_MS = 200;

/**
 * Side drawer on desktop, bottom sheet on phones. Built on <dialog> (focus trap, inert page, Esc)
 * with transform-only transitions: iOS drawer curve in (280ms), faster ease-out exit (200ms).
 * Children are kept rendered during the exit so the panel never empties while sliding away.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
  resetKey,
}: {
  /** When this changes while open (e.g. a different booking), the body scrolls back to the top. */
  resetKey?: unknown;
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [shown, setShown] = useState(false);
  const last = useRef({ title, subtitle, children, footer });
  if (open) last.current = { title, subtitle, children, footer };
  const view = open ? { title, subtitle, children, footer } : last.current;

  const body = useRef<HTMLDivElement>(null);
  // Every opening (and every content switch) starts at the top: header info + quick actions first.
  useLayoutEffect(() => {
    if (open && body.current) body.current.scrollTop = 0;
  }, [open, resetKey]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) {
        d.showModal();
        void d.offsetHeight; // commit the closed transform before flipping to open
        if (body.current) body.current.scrollTop = 0; // now laid out, so the reset sticks
      }
      setShown(true);
      const prev = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.documentElement.style.overflow = prev;
      };
    }
    if (d.open) {
      setShown(false);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const t = setTimeout(() => d.close(), reduce ? 0 : EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Mobile drag-to-dismiss on the handle/header: distance OR a quick flick closes it.
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number } | null>(null);
  const isPhone = () => !window.matchMedia("(min-width: 640px)").matches;

  function onPointerDown(e: React.PointerEvent) {
    if (!isPhone() || drag.current || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d || !panel.current) return;
    const raw = e.clientY - d.y;
    d.dy = raw < 0 ? -Math.sqrt(-raw) * 2 : raw; // friction when pulling up
    panel.current.style.transform = `translateY(${d.dy}px)`;
  }
  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    const el = panel.current;
    if (!d || !el) return;
    const velocity = Math.abs(d.dy) / Math.max(1, performance.now() - d.t);
    el.style.transition = "";
    el.style.transform = "";
    if (d.dy > 120 || (d.dy > 10 && velocity > 0.11)) onClose();
  }

  return (
    <dialog
      ref={ref}
      data-open={shown}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="group fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink backdrop:bg-transparent"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 opacity-0 transition-opacity duration-200 ease-out group-data-[open=true]:opacity-100"
      />
      <div
        ref={panel}
        role="document"
        className={cn(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-[22px] border-t border-line-strong bg-card shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.9)]",
          "translate-y-full transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] will-change-transform",
          "group-data-[open=true]:translate-y-0 group-data-[open=true]:duration-[280ms] group-data-[open=true]:ease-[cubic-bezier(0.32,0.72,0,1)]",
          "sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[min(480px,100vw)] sm:translate-x-full sm:translate-y-0 sm:rounded-none sm:rounded-l-[22px] sm:border-t-0 sm:border-l",
          "sm:group-data-[open=true]:translate-x-0",
          className,
        )}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="touch-none select-none sm:touch-auto sm:select-auto"
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 pb-4 pt-3 sm:pt-5">
            <div className="min-w-0">
              {view.title && (
                <h2 id={titleId} className="line-clamp-2 break-words text-lg font-semibold leading-tight sm:line-clamp-1">
                  {view.title}
                </h2>
              )}
              {view.subtitle && <div className="mt-1 text-sm text-dim">{view.subtitle}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2.5 -mt-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-dim transition-colors hover:bg-white/5 hover:text-ink active:bg-white/10 sm:-mt-1 sm:h-9 sm:w-9"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
        </div>
        <div
          ref={body}
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5",
            !view.footer && "pb-[max(1.25rem,env(safe-area-inset-bottom))]",
          )}
        >
          {view.children}
        </div>
        {view.footer && (
          <footer className="border-t border-line bg-card px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {view.footer}
          </footer>
        )}
      </div>
    </dialog>
  );
}
