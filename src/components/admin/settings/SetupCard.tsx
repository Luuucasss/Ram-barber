"use client";

import { useState } from "react";
import { Check, Database, Info } from "lucide-react";
import { Button, Card, ErrorText } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client-api";

type SetupResult = { created: string[]; alreadyInitialized: boolean };

/** Runs POST /api/admin/setup: loads starter data only into an empty database (idempotent). */
export function SetupCard() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      setResult(await api<SetupResult>("/api/admin/setup", { method: "POST" }));
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "No se pudo completar. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-dim" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Datos iniciales</h2>
          <p className="mt-1 text-sm text-dim">
            Carga la configuración, una sucursal, los servicios base y un barbero con horario de ejemplo.{" "}
            <strong className="font-medium text-ink">Solo completa lo que falta en una base vacía</strong>: si ya hay datos, no toca
            nada. También prepara los índices de la base de datos.
          </p>
        </div>
      </div>

      {result && (
        <div
          role="status"
          className="flex animate-[fade_200ms_ease-out_both] gap-3 rounded-2xl border border-line-strong bg-surface px-4 py-3 text-sm"
        >
          {result.alreadyInitialized ? (
            <>
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-dim" aria-hidden="true" />
              <p className="text-dim">La base ya tenía datos: no se creó ni modificó nada.</p>
            </>
          ) : (
            <>
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" />
              <div>
                <p className="font-medium text-ink">Listo. Se creó:</p>
                <ul className="mt-1 list-inside list-disc text-dim">
                  {result.created.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-faint">Recargá la página para ver los valores cargados.</p>
              </div>
            </>
          )}
        </div>
      )}
      <ErrorText>{error}</ErrorText>

      <div>
        <Button variant="outline" onClick={run} loading={busy}>
          Cargar datos iniciales
        </Button>
      </div>
    </Card>
  );
}
