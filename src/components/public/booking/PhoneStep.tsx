"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Phone } from "lucide-react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { Avatar } from "./parts";
import { STORAGE_KEYS, readStorage } from "./storage";

type Remembered = { phone: string; name: string };

export function PhoneStep({
  initialPhone,
  loading,
  error,
  onSubmit,
}: {
  initialPhone: string;
  loading: boolean;
  error: string | null;
  onSubmit: (phone: string) => void;
}) {
  const [value, setValue] = useState(initialPhone ? formatPhone(initialPhone) : "");
  const [localError, setLocalError] = useState<string | null>(null);
  // `undefined` = not read yet (avoids flashing the form before we know about a remembered phone).
  const [remembered, setRemembered] = useState<Remembered | null | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const phone = normalizePhone(readStorage(STORAGE_KEYS.phone) ?? "");
    const name = (readStorage(STORAGE_KEYS.name) ?? "").trim();
    setRemembered(phone && !initialPhone ? { phone, name } : null);
  }, [initialPhone]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const phone = normalizePhone(value);
    if (!phone) {
      setLocalError("Revisá el número: código de área + número, sin 0 y sin 15.");
      inputRef.current?.focus();
      return;
    }
    setLocalError(null);
    onSubmit(phone);
  }

  if (remembered === undefined) return <div className="h-48" aria-hidden="true" />;

  if (remembered) {
    const first = remembered.name.split(/\s+/)[0];
    return (
      <div className="rb-stagger flex flex-col gap-4">
        <div
          style={{ "--i": 0 } as React.CSSProperties}
          className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-card p-4"
        >
          <Avatar name={remembered.name || "R"} size={52} />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-dim">¿Sos vos?</p>
            <p className="truncate text-lg font-semibold">{remembered.name || "Tu número guardado"}</p>
            <p className="text-sm tabular-nums text-dim">{formatPhone(remembered.phone)}</p>
          </div>
        </div>
        <div style={{ "--i": 1 } as React.CSSProperties}>
          <Button size="lg" block loading={loading} onClick={() => onSubmit(remembered.phone)}>
            {first ? `Continuar como ${first}` : "Continuar con este número"}
            {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </Button>
        </div>
        <div style={{ "--i": 2 } as React.CSSProperties}>
          <Button
            variant="ghost"
            block
            disabled={loading}
            onClick={() => {
              setRemembered(null);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            Usar otro número
          </Button>
        </div>
        <ErrorText>{error}</ErrorText>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rb-stagger flex flex-col gap-5">
      <div style={{ "--i": 0 } as React.CSSProperties}>
        <Field
          label="Tu celular"
          hint="Código de área + número, sin 0 y sin 15. Ej: 351 555 1234"
          error={localError ?? undefined}
        >
          {(id) => (
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
              <Input
                ref={inputRef}
                id={id}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                enterKeyHint="go"
                placeholder="351 555 1234"
                autoFocus
                value={value}
                aria-invalid={Boolean(localError)}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (localError) setLocalError(null);
                }}
                className="h-14 pl-11 text-lg tracking-wide tabular-nums"
                maxLength={20}
              />
            </div>
          )}
        </Field>
      </div>
      <div style={{ "--i": 1 } as React.CSSProperties}>
        <Button type="submit" size="lg" block loading={loading}>
          Continuar
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
      <p style={{ "--i": 2 } as React.CSSProperties} className="text-center text-xs leading-relaxed text-faint">
        Usamos tu número solo para identificar tus turnos y avisarte por WhatsApp.
      </p>
    </form>
  );
}
