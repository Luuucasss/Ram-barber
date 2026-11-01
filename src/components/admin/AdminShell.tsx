"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

/** Day-to-day screens that live in the phone tab bar; everything else is under "Más". */
const TAB_HREFS = ["/admin", "/admin/turnos", "/admin/clientes"] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  // Close the drawer on navigation and with Esc; lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const inMore = !TAB_HREFS.some((h) => isActive(h));

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {ADMIN_NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors lg:min-h-0 lg:text-sm",
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
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-dim hover:bg-white/5 hover:text-ink lg:min-h-0 lg:text-sm"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ver sitio público
        </Link>
        <button
          onClick={logout}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] text-dim hover:bg-white/5 hover:text-ink lg:min-h-0 lg:text-sm"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" /> Cerrar sesión
        </button>
      </div>
    </nav>
  );

  const brand = (
    <Link href="/admin" className="flex min-h-11 items-center gap-2.5 px-2">
      <Rose size={26} tone="light" />
      <span className="leading-none">
        <span className="block font-gothic text-2xl">Ram</span>
        <span className="block text-[9px] uppercase tracking-[0.35em] text-dim">Panel</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh [--admin-tabbar-h:calc(4rem+env(safe-area-inset-bottom))] lg:grid lg:grid-cols-[240px_1fr] lg:[--admin-tabbar-h:0px]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface px-3 py-5 lg:flex">
        {brand}
        {nav}
      </aside>

      <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between border-b border-line bg-bg/90 pl-2 pr-1 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
        {brand}
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink transition-colors active:bg-white/10"
          aria-label="Abrir menú"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/70 animate-fade" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col gap-4 overflow-y-auto overscroll-contain border-r border-line bg-surface px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] animate-reveal">
            <div className="flex items-center justify-between">
              {brand}
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-dim transition-colors active:bg-white/10"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 pb-[calc(var(--admin-tabbar-h)+1.5rem)] pt-5 sm:px-6 sm:pt-6 lg:px-10 lg:py-8">
        {children}
      </main>

      {/* Phone / tablet tab bar: the screens used at the counter, within thumb reach. */}
      <nav
        aria-label="Secciones principales"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {ADMIN_NAV.filter((n) => (TAB_HREFS as readonly string[]).includes(n.href)).map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                active ? "text-ink" : "text-faint active:text-dim",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0 h-0.5 w-8 rounded-full bg-ink transition-transform duration-200 ease-out",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          className={cn(
            "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
            inMore ? "text-ink" : "text-faint active:text-dim",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-0 h-0.5 w-8 rounded-full bg-ink transition-transform duration-200 ease-out",
              inMore ? "scale-x-100" : "scale-x-0",
            )}
          />
          <Menu className="h-5 w-5" aria-hidden="true" />
          Más
        </button>
      </nav>
    </div>
  );
}

/** Standard page header for admin screens. */
export function AdminPageHeader({
  title,
  description,
  actions,
  actionsClassName,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** e.g. "hidden md:flex" when the phone gets the action from an AdminFab instead. */
  actionsClassName?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-dim">{description}</p>}
      </div>
      {actions && <div className={cn("flex flex-wrap gap-2", actionsClassName)}>{actions}</div>}
    </div>
  );
}

/**
 * Floating primary action for phones, parked above the tab bar (and the home indicator) so it is
 * always under the thumb. Hidden from md up, where the page header shows the same action.
 */
export function AdminFab({
  onClick,
  icon,
  children,
  title,
  revealAfterId,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  /**
   * Id of an inline button doing the same thing. While that button is on screen the FAB stays
   * hidden (so it never covers the first rows on load); it slides in once the button scrolls away.
   */
  revealAfterId?: string;
}) {
  const [hidden, setHidden] = useState(Boolean(revealAfterId));
  useEffect(() => {
    if (!revealAfterId) return;
    // Plain passive scroll check (a couple of rect reads) rather than IntersectionObserver, which
    // some embedded/background webviews never deliver — the FAB must not get stuck hidden.
    const check = () => {
      const el = document.getElementById(revealAfterId);
      if (!el) return setHidden(false);
      const r = el.getBoundingClientRect();
      // The sticky app header (~56px + notch) covers the top strip, so count it as off-screen.
      const visible = r.height > 0 && r.bottom > 64 && r.top < window.innerHeight;
      setHidden(visible);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [revealAfterId]);

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className={cn(
        "fixed right-4 z-20 inline-flex h-14 items-center gap-2 rounded-full bg-ink pl-5 pr-6 text-[15px] font-semibold text-bg shadow-[0_0_0_1px_var(--color-ink),0_18px_40px_-12px_rgba(0,0,0,0.9),0_10px_30px_-10px_rgba(255,255,255,0.35)] transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] bottom-[calc(var(--admin-tabbar-h,0px)+1rem)] md:hidden",
        revealAfterId ? (hidden ? "pointer-events-none translate-y-4 scale-90 opacity-0" : "translate-y-0 opacity-100") : "animate-fade",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
