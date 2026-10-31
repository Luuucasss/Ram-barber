"use client";

import { useEffect, useRef, useState } from "react";

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Calls `fn` every `ms` while the tab is visible, and right away when the window regains focus. */
export function useAutoRefresh(fn: () => void, ms = 60_000) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    let last = Date.now();
    const run = () => {
      last = Date.now();
      ref.current();
    };
    const id = setInterval(() => {
      if (document.visibilityState === "visible") run();
    }, ms);
    // Focus and visibilitychange often fire together; skip if we refreshed a moment ago.
    const onFocus = () => {
      if (document.visibilityState === "visible" && Date.now() - last > 3_000) run();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [ms]);
}

/** Global single-key shortcuts, ignored while typing or when a dialog is open. */
export function useShortcuts(map: Record<string, () => void>) {
  const ref = useRef(map);
  ref.current = map;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      const fn = ref.current[e.key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
