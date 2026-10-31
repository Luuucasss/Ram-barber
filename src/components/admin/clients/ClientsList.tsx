"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, ChevronRight, Gift, Search, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Pagination } from "@/components/admin/bookings/Pagination";
import { sinceDays } from "@/components/admin/bookings/fmt";
import { useDebounced } from "@/components/admin/bookings/hooks";
import { useCatalog } from "@/components/admin/bookings/useCatalog";
import { EmptyState, ErrorText, Input, Select } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { ClientListResponse } from "./types";

const SORTS = [
  ["recent", "Última visita"],
  ["name", "Nombre"],
  ["visits", "Más visitas"],
] as const;

export function ClientsList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { catalog } = useCatalog();
  const today = catalog?.today ?? new Date().toISOString().slice(0, 10);

  const q = params.get("q") ?? "";
  const sort = params.get("sort") ?? "recent";
  const page = Math.max(1, Number(params.get("page")) || 1);

  const [qInput, setQInput] = useState(q);
  const debounced = useDebounced(qInput, 300);
  const [data, setData] = useState<ClientListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const setParams = useCallback(
    (patch: Record<string, string | number>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === "" || (k === "page" && v === 1) || (k === "sort" && v === "recent")) next.delete(k);
        else next.set(k, String(v));
      }
      if (!("page" in patch)) next.delete("page");
      const s = next.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    if (debounced !== q) setParams({ q: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    const qs = new URLSearchParams({ q, sort, page: String(page) });
    api<ClientListResponse>(`/api/admin/clients?${qs}`, { signal: ctrl.signal })
      .then((r) => {
        setData(r);
        setError(null);
      })
      .catch((e: Error) => e.name !== "AbortError" && setError(e.message))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [q, sort, page]);

  // "/" focuses search, like most admin tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Clientes"
        description={data ? `${data.total} ${data.total === 1 ? "cliente" : "clientes"}${q ? " encontrados" : ""}` : " "}
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nombre o teléfono</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input
            ref={searchRef}
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Buscar por nombre o teléfono  ( / )"
            className="h-11 rounded-xl pl-9 text-sm"
          />
        </label>
        <Select
          value={sort}
          onChange={(e) => setParams({ sort: e.target.value })}
          className="h-11 rounded-xl text-sm sm:w-48"
          aria-label="Ordenar por"
        >
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              Orden: {l}
            </option>
          ))}
        </Select>
      </div>

      <ErrorText>{error}</ErrorText>

      {!data ? (
        <div className="h-80 animate-pulse rounded-[var(--radius-card)] border border-line bg-card" aria-busy="true" />
      ) : !data.items.length ? (
        <EmptyState title={q ? "Sin resultados" : "Todavía no hay clientes"} icon={<Users className="h-6 w-6" />}>
          {q ? "Probá con otra parte del nombre o los últimos dígitos del teléfono." : "Se crean solos con cada reserva."}
        </EmptyState>
      ) : (
        <div className={cn("flex flex-col gap-4 transition-opacity duration-200", loading && "opacity-60")}>
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-line">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_repeat(3,72px)_minmax(0,1fr)_96px_20px] gap-3 bg-surface px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-faint md:grid">
              <span>Cliente</span>
              <span>Teléfono</span>
              <span className="text-right">Turnos</span>
              <span className="text-right">Visitas</span>
              <span className="text-right">No vino</span>
              <span>Última visita</span>
              <span>Tarjeta</span>
              <span />
            </div>
            <ul className="divide-y divide-line bg-card">
              {data.items.map((c) => (
                <li key={c._id}>
                  <Link
                    href={`/admin/clientes/${c._id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors duration-150 hover:bg-card-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_repeat(3,72px)_minmax(0,1fr)_96px_20px]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-medium">{c.name || "Sin nombre"}</span>
                      {c.member && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-ink px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider">
                          <BadgeCheck className="h-3 w-3" aria-hidden="true" /> Socio
                        </span>
                      )}
                      {c.pendingGifts > 0 && <Gift className="h-3.5 w-3.5 shrink-0 text-warn" aria-label="Regalo pendiente" />}
                    </span>
                    <span className="text-right text-sm tabular-nums text-dim md:text-left">{formatPhone(c.phone)}</span>
                    <span className="hidden text-right tabular-nums md:block">{c.stats.bookings}</span>
                    <span className="hidden text-right tabular-nums md:block">{c.stats.completed}</span>
                    <span className={cn("hidden text-right tabular-nums md:block", c.stats.noShows ? "text-warn" : "text-faint")}>
                      {c.stats.noShows}
                    </span>
                    <span className="text-xs text-dim md:text-sm">
                      <span className="md:hidden">
                        {c.stats.completed} visitas · {c.stats.noShows} no vino ·{" "}
                      </span>
                      {sinceDays(c.lastVisitAt, today)}
                    </span>
                    <span className="flex items-center justify-end gap-2 md:justify-start">
                      {data.loyaltyEnabled && <StampDots stamps={c.stamps} size={data.cardSize} />}
                    </span>
                    <ChevronRight className="hidden h-4 w-4 text-faint md:block" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={(p) => setParams({ page: p })} />
        </div>
      )}
    </div>
  );
}

function StampDots({ stamps, size }: { stamps: number; size: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" title={`${stamps} de ${size} sellos`}>
      <span className="text-xs tabular-nums text-dim">
        {stamps}/{size}
      </span>
      <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-line sm:block" aria-hidden="true">
        <span className="block h-full rounded-full bg-ink" style={{ width: `${Math.min(100, (stamps / size) * 100)}%` }} />
      </span>
    </span>
  );
}
