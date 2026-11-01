"use client";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues?: unknown,
  ) {
    super(message);
  }
}

/** Browser fetch wrapper for our `{ ok, data } | { ok:false, error }` API envelope. */
export async function api<T>(url: string, opts: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body ? "POST" : "GET"),
      headers: opts.body ? { "Content-Type": "application/json" } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiClientError(0, "network", "No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
  }
  const json = await res.json().catch(() => null);
  if (!json?.ok) {
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/admin") &&
      !window.location.pathname.startsWith("/admin/login")
    ) {
      window.location.href = `/admin/login?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiClientError(
      res.status,
      json?.error?.code ?? "unknown",
      json?.error?.message ?? "Ocurrió un error. Probá de nuevo en unos segundos.",
      json?.error?.issues,
    );
  }
  return json.data as T;
}
