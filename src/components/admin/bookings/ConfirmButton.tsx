"use client";

import { useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Two-step destructive action without a nested modal: first press arms it ("¿Seguro?"),
 * second press confirms. Disarms itself after a few seconds or on blur.
 */
export function ConfirmButton({
  onConfirm,
  confirmLabel = "¿Confirmás?",
  children,
  className,
  variant = "outline",
  ...props
}: Omit<ButtonProps, "onClick"> & { onConfirm: () => void; confirmLabel?: React.ReactNode }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <Button
      {...props}
      type="button"
      // Armed = inverted solid ink (black & white design: no red), unmistakably different from idle.
      variant={armed ? "primary" : variant}
      aria-live="polite"
      onBlur={() => setArmed(false)}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
          return;
        }
        setArmed(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setArmed(false), 4000);
      }}
      className={cn(armed && "ring-2 ring-ink/40 ring-offset-2 ring-offset-card", className)}
    >
      {armed ? confirmLabel : children}
    </Button>
  );
}
