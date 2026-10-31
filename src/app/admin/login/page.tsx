"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";
import { api, ApiClientError } from "@/lib/client-api";
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
      await api("/api/admin/login", { body: { password } });
      const next = params.get("next");
      router.replace(next && next.startsWith("/admin") ? next : "/admin");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "No pudimos iniciar sesión.");
      setLoading(false);
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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
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
