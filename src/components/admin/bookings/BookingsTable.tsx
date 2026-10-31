"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Check, Download, Plus, Search, UserX, X } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminShell";
import { Button, EmptyState, ErrorText, Input, Select } from "@/components/ui";
import { api } from "@/lib/client-api";
import { formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { BookingDrawer } from "./BookingDrawer";
import { NewBookingSheet } from "./NewBookingSheet";
import { Pagination } from "./Pagination";
import { StatusPill } from "./StatusPill";
import { bookingsToCsv, downloadText } from "./csv";
import { shortDate } from "./fmt";
import { useAutoRefresh, useDebounced } from "./hooks";
import { STATUSES, STATUS_LABEL, type AdminBooking, type BookingStatus } from "./types";
import { useCatalog } from "./useCatalog";

const PAGE_SIZE = 25;
type ListResponse = { items: AdminBooking[]; total: number; page: number; pageSize: number };

/** Filterable, server-paginated booking list. Filters live in the URL so the view is shareable/reloadable. */
export function BookingsTable() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { catalog } = useCatalog();
  const today = catalog?.today ?? "";

  // `from` defaults to today; an explicit empty `from=` means "no lower bound".
  const filters = {
    from: params.has("from") ? (params.get("from") ?? "") : today,
    to: params.get("to") ?? "",
    status: params.get("status") ?? "",
    barberId: params.get("barber") ?? "",
    q: params.get("q") ?? "",
    sort: params.get("sort") === "desc" ? "desc" : "asc",
    page: Math.max(1, Number(params.get("page")) || 1),
  };

  const [qInput, setQInput] = useState(filters.q);
  const debouncedQ = useDebounced(qInput, 300);

  const setParams = useCallback(
    (patch: Record<string, string | number | null>, resetPage = true) => {
      const next = new URLSearchParams(params.toString());
      if (!next.has("from") && today) next.set("from", today);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, String(v));
      }
      if (resetPage && !("page" in patch)) next.delete("page");
      for (const k of ["to", "status", "barber", "q", "sort", "page"]) if (next.get(k) === "") next.delete(k);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router, today],
  );

  useEffect(() => {
    if (debouncedQ !== filters.q) setParams({ q: debouncedQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const query = useMemo(() => {
    const qs = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      status: filters.status,
      barberId: filters.barberId,
      q: filters.q,
      sort: filters.sort,
    });
    return qs;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.status, filters.barberId, filters.q, filters.sort]);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  const ctrl = useRef<AbortController | null>(null);
  const load = useCallback(
    async (silent = false) => {
      if (!catalog) return;
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      if (!silent) setLoading(true);
      try {
        const qs = new URLSearchParams(query);
        qs.set("page", String(filters.page));
        qs.set("pageSize", String(PAGE_SIZE));
        const r = await api<ListResponse>(`/api/admin/bookings?${qs}`, { signal: c.signal });
        setData(r);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (ctrl.current === c) setLoading(false);
      }
    },
    [catalog, query, filters.page],
  );

  useEffect(() => {
    load();
    return () => ctrl.current?.abort();
  }, [load]);
  useAutoRefresh(() => load(true), 60_000);

  const replaceRow = useCallback((b: AdminBooking) => {
    setSelected((s) => (s && s._id === b._id ? b : s));
    setData((d) => (d ? { ...d, items: d.items.map((x) => (x._id === b._id ? b : x)) } : d));
  }, []);

  async function quickStatus(b: AdminBooking, status: BookingStatus) {
    setRowBusy(b._id);
    replaceRow({ ...b, status, active: status !== "cancelled" });
    try {
      const r = await api<{ booking: AdminBooking }>(`/api/admin/bookings/${b._id}`, { method: "PATCH", body: { status } });
      replaceRow(r.booking);
      setError(null);
    } catch (e) {
      replaceRow(b);
      setError((e as Error).message);
    } finally {
      setRowBusy(null);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setError(null);
    try {
      const all: AdminBooking[] = [];
      for (let page = 1; page <= 40; page++) {
        const qs = new URLSearchParams(query);
        qs.set("page", String(page));
        qs.set("pageSize", "500");
        const r = await api<ListResponse>(`/api/admin/bookings?${qs}`);
        all.push(...r.items);
        if (all.length >= r.total || !r.items.length) break;
      }
      const range = [filters.from || "inicio", filters.to || "hoy-en-adelante"].join("_");
      downloadText(`turnos_${range}.csv`, bookingsToCsv(all));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  const barbers = catalog?.barbers ?? [];
  const currency = catalog?.settings.currency ?? "ARS";
  const hasFilters = Boolean(filters.to || filters.status || filters.barberId || filters.q || filters.from !== today);

  const open = (b: AdminBooking) => {
    setSelected(b);
    setDrawerOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <AdminPageHeader
        title="Turnos"
        description={data ? `${data.total} ${data.total === 1 ? "turno" : "turnos"} con estos filtros` : "Historial y próximos turnos"}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={exportCsv} loading={exporting} disabled={!data?.total}>
              {!exporting && <Download className="h-4 w-4" aria-hidden="true" />} Exportar CSV
            </Button>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Nuevo turno
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-[minmax(200px,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
        <label className="relative col-span-2 sm:col-span-3 lg:col-span-1">
          <span className="sr-only">Buscar por nombre o teléfono</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden="true" />
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Nombre o teléfono"
            className="h-10 rounded-xl pl-9 text-sm"
            type="search"
          />
        </label>
        <label className="flex flex-col">
          <span className="sr-only">Desde</span>
          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setParams({ from: e.target.value })}
            className="h-10 rounded-xl px-3 text-sm"
            title="Desde"
          />
        </label>
        <label className="flex flex-col">
          <span className="sr-only">Hasta</span>
          <Input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => setParams({ to: e.target.value })}
            className="h-10 rounded-xl px-3 text-sm"
            title="Hasta"
          />
        </label>
        <Select
          value={filters.status}
          onChange={(e) => setParams({ status: e.target.value })}
          className="h-10 rounded-xl px-3 text-sm"
          aria-label="Estado"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select
          value={filters.barberId}
          onChange={(e) => setParams({ barber: e.target.value })}
          className="h-10 rounded-xl px-3 text-sm"
          aria-label="Barbero"
        >
          <option value="">Todos los barberos</option>
          {barbers.map((b) => (
            <option key={b._id} value={b._id}>
              {b.name}
              {b.active ? "" : " (inactivo)"}
            </option>
          ))}
        </Select>
        <div className="col-span-2 flex items-center gap-1 sm:col-span-1">
          <button
            type="button"
            onClick={() => setParams({ sort: filters.sort === "asc" ? "desc" : "asc" })}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line px-3 text-sm text-dim transition-colors hover:border-line-strong hover:text-ink"
            title="Ordenar por fecha y hora"
          >
            {filters.sort === "asc" ? (
              <ArrowUpNarrowWide className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ArrowDownNarrowWide className="h-4 w-4" aria-hidden="true" />
            )}
            {filters.sort === "asc" ? "Ascendente" : "Descendente"}
          </button>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setQInput("");
                router.replace(pathname, { scroll: false });
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl px-2.5 text-dim transition-colors hover:bg-white/5 hover:text-ink"
              aria-label="Limpiar filtros"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {filters.from && (
        <p className="-mt-3 text-xs text-faint">
          Desde {shortDate(filters.from)}
          {filters.to ? ` hasta ${shortDate(filters.to)}` : " en adelante"} ·{" "}
          <button type="button" className="underline-offset-2 hover:text-ink hover:underline" onClick={() => setParams({ from: "" })}>
            ver todo el historial
          </button>
        </p>
      )}

      <ErrorText>{error}</ErrorText>

      {!data ? (
        <div className="h-80 animate-pulse rounded-[var(--radius-card)] border border-line bg-card" aria-busy="true" />
      ) : !data.items.length ? (
        <EmptyState title="No hay turnos con estos filtros">Probá ampliar el rango de fechas o quitar filtros.</EmptyState>
      ) : (
        <div className={cn("flex flex-col gap-4 transition-opacity duration-200", loading && "opacity-60")}>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[var(--radius-card)] border border-line md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-[11px] uppercase tracking-[0.14em] text-faint">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-2 py-3 font-medium">Cliente</th>
                  <th className="px-2 py-3 font-medium">Servicio</th>
                  <th className="hidden px-2 py-3 font-medium lg:table-cell">Barbero</th>
                  <th className="px-2 py-3 text-right font-medium">Precio</th>
                  <th className="px-2 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-card">
                {data.items.map((b) => (
                  <tr
                    key={b._id}
                    onClick={() => open(b)}
                    className="cursor-pointer transition-colors duration-150 hover:bg-card-2"
                  >
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      <span className={cn("font-medium", b.date === today && "text-ink")}>
                        {b.date === today ? "Hoy" : shortDate(b.date)}
                      </span>{" "}
                      <span className="text-dim">{b.start}</span>
                    </td>
                    <td className="max-w-[220px] px-2 py-3">
                      <p className={cn("truncate font-medium", b.status === "cancelled" && "text-dim line-through")}>
                        {b.clientName || "—"}
                      </p>
                      <p className="text-xs tabular-nums text-faint">{formatPhone(b.clientPhone)}</p>
                    </td>
                    <td className="max-w-[200px] truncate px-2 py-3 text-dim">{b.serviceName}</td>
                    <td className="hidden px-2 py-3 text-dim lg:table-cell">{b.barberName}</td>
                    <td className="whitespace-nowrap px-2 py-3 text-right tabular-nums">
                      {formatPrice(b.finalPrice, currency)}
                      {b.discountPercent > 0 && <span className="ml-1 text-xs text-faint">−{b.discountPercent}%</span>}
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <RowActions b={b} busy={rowBusy === b._id} onStatus={quickStatus} onMore={() => open(b)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {data.items.map((b) => (
              <li key={b._id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => open(b)}
                  onKeyDown={(e) => e.key === "Enter" && open(b)}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-card px-4 py-3 transition-transform duration-150 ease-out active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={cn("truncate font-medium", b.status === "cancelled" && "text-dim line-through")}>
                        {b.clientName || formatPhone(b.clientPhone)}
                      </p>
                      <p className="truncate text-xs text-dim">
                        {b.serviceName} · {b.barberName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right tabular-nums">
                      <p className="text-sm font-semibold">{b.date === today ? "Hoy" : shortDate(b.date)}</p>
                      <p className="text-xs text-dim">{b.start}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <StatusPill status={b.status} />
                      <span className="text-sm tabular-nums text-dim">{formatPrice(b.finalPrice, currency)}</span>
                    </div>
                    <RowActions b={b} busy={rowBusy === b._id} onStatus={quickStatus} />
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPage={(p) => setParams({ page: p }, false)}
          />
        </div>
      )}

      <BookingDrawer
        booking={selected}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onChange={replaceRow}
        currency={currency}
        businessName={catalog?.settings.businessName}
        today={today}
      />
      <NewBookingSheet
        open={newOpen}
        onClose={() => setNewOpen(false)}
        defaultDate={today}
        onCreated={() => load(true)}
      />
    </div>
  );
}

function RowActions({
  b,
  busy,
  onStatus,
  onMore,
}: {
  b: AdminBooking;
  busy: boolean;
  onStatus: (b: AdminBooking, s: BookingStatus) => void;
  onMore?: () => void;
}) {
  const icon =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line text-dim transition-[color,border-color,transform] duration-150 ease-out hover:border-ink hover:text-ink active:scale-[0.95] disabled:opacity-40";
  return (
    <div className="flex items-center justify-end gap-1.5">
      {b.status === "confirmed" && (
        <>
          <button
            type="button"
            className={icon}
            disabled={busy}
            onClick={() => onStatus(b, "completed")}
            aria-label="Marcar asistió"
            title="Asistió"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={icon}
            disabled={busy}
            onClick={() => onStatus(b, "no_show")}
            aria-label="Marcar no vino"
            title="No vino"
          >
            <UserX className="h-4 w-4" />
          </button>
        </>
      )}
      {onMore && (
        <button
          type="button"
          onClick={onMore}
          className="h-8 rounded-lg px-2.5 text-xs font-medium text-dim transition-colors hover:bg-white/5 hover:text-ink"
        >
          Ver
        </button>
      )}
    </div>
  );
}
