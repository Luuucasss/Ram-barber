"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Users,
  Scissors,
  UserRound,
  Store,
  CalendarOff,
  Gift,
  Settings,
  LogOut,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Rose } from "@/components/ornaments";

export const ADMIN_NAV = [
  { href: "/admin", label: "Agenda", icon: CalendarDays },
  { href: "/admin/turnos", label: "Turnos", icon: ClipboardList },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/barberos", label: "Barberos", icon: UserRound },
  { href: "/admin/servicios", label: "Servicios", icon: Scissors },
  { href: "/admin/sucursales", label: "Sucursales", icon: Store },
  { href: "/admin/bloqueos", label: "Bloqueos", icon: CalendarOff },
  { href: "/admin/fidelidad", label: "Fidelidad", icon: Gift },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={cn(
            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
            isActive(href) ? "bg-ink font-semibold text-bg" : "text-dim hover:bg-white/5 hover:text-ink",
          )}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-dim hover:bg-white/5 hover:text-ink"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ver sitio público
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-dim hover:bg-white/5 hover:text-ink"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
        </button>
      </div>
    </nav>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-2.5 px-2">
      <Rose size={26} tone="light" />
      <span className="leading-none">
        <span className="block font-gothic text-2xl">Ram</span>
        <span className="block text-[9px] uppercase tracking-[0.35em] text-dim">Panel</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-3 py-5 lg:flex">
        {brand}
        {nav}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        {brand}
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink" aria-label="Abrir menú">
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 animate-fade" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 border-r border-line bg-surface px-3 py-5 animate-reveal">
            <div className="flex items-center justify-between">
              {brand}
              <button onClick={() => setOpen(false)} className="rounded-lg p-2" aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}

/** Standard page header for admin screens. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-dim">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
