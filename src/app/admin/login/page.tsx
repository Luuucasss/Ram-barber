"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { Button, ErrorText, Field, Input } from "@/components/ui";
import { HaloRays, Rose } from "@/components/ornaments";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Plain fetch on purpose: the shared api() helper redirects every 401 under /admin back to the
      // login page, which would swallow the "wrong password" error and wipe the field.
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (!json?.ok) {
        throw new Error(
          res.status === 401
            ? (json?.error?.message ?? "Contraseña incorrecta.")
            : (json?.error?.message ?? "No pudimos iniciar sesión. Probá de nuevo."),
        );
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin");
    } catch (err) {
      const msg = err instanceof Error && err.message && err.name !== "TypeError" ? err.message : "No pudimos conectar con el servidor. Revisá tu conexión.";
      setError(msg);
      setLoading(false);
      requestAnimationFrame(() => {
        const input = document.querySelector<HTMLInputElement>('form input[type="password"]');
        input?.select();
      });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Contraseña">
        {(id) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
      </Field>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" size="lg" block loading={loading}>
        <Lock className="h-4 w-4" aria-hidden="true" /> Entrar
      </Button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-[max(1.5rem,env(safe-area-inset-top))]">
      <HaloRays size={760} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-25" />
      <div className="relative w-full max-w-sm animate-reveal">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Rose size={56} tone="light" className="animate-float" />
          <h1 className="font-gothic text-5xl">Ram</h1>
          <p className="text-xs uppercase tracking-[0.4em] text-dim">Panel de administración</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-card/80 p-6 backdrop-blur">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
