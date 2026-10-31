"use client";

import { useEffect, useState } from "react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { readPhone } from "./storage";

/** Phone form shared by "Mis turnos" and "Fidelidad". Prefills from `ram_tel`. */
export function PhoneLookup({
  onSubmit,
  loading,
  error,
  submitLabel,
  autoFocus,
}: {
  onSubmit: (phone: string) => void;
  loading?: boolean;
  error?: string;
  submitLabel: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [localError, setLocalError] = useState("");

  // Read storage after mount so server and client render the same markup.
  useEffect(() => {
    const stored = readPhone();
    if (!stored) return;
    const normalized = normalizePhone(stored);
    setValue((v) => v || (normalized ? formatPhone(normalized) : stored));
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const phone = normalizePhone(value);
    if (!phone) {
      setLocalError("Ingresá código de área + número, sin 0 y sin 15. Ej: 351 555 1234");
      return;
    }
    setLocalError("");
    onSubmit(phone);
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Tu teléfono" hint="Código de área + número, sin 0 y sin 15." error={localError}>
        {(id) => (
          <Input
            id={id}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="351 555 1234"
            value={value}
            autoFocus={autoFocus}
            aria-invalid={localError ? true : undefined}
            onChange={(e) => {
              setValue(e.target.value);
              if (localError) setLocalError("");
            }}
            className="h-14 text-lg tracking-wide"
          />
        )}
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="lg" block loading={loading}>
        {submitLabel}
      </Button>
    </form>
  );
}
