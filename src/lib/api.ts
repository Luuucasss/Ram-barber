import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { connectDB } from "./db";
import { getAdminSession } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
  ) {
    super(message ?? code);
  }
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false; error: { code: string; message: string; issues?: unknown } };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);
}

export function fail(status: number, code: string, message: string, issues?: unknown) {
  return NextResponse.json<ApiFailure>({ ok: false, error: { code, message, issues } }, { status });
}

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<Response>;

/**
 * Wraps a route handler: connects to MongoDB, enforces admin auth when asked,
 * and maps ApiError / ZodError / Mongo duplicate-key errors to JSON responses.
 */
export function route<P = Record<string, string>>(fn: Handler<P>, opts: { admin?: boolean } = {}): Handler<P> {
  return async (req, ctx) => {
    try {
      if (opts.admin && !(await getAdminSession(req))) {
        return fail(401, "unauthorized", "Tenés que iniciar sesión.");
      }
      await connectDB();
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return fail(e.status, e.code, e.message);
      if (e instanceof ZodError) return fail(400, "invalid_input", "Revisá los datos ingresados.", e.flatten());
      if (isDuplicateKey(e)) return fail(409, "duplicate", "Ya existe un registro con esos datos.");
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return fail(500, "server_error", "Ocurrió un error inesperado. Probá de nuevo en unos segundos.");
    }
  };
}

export async function readJson<S extends ZodTypeAny>(req: NextRequest, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "El cuerpo de la solicitud no es JSON válido.");
  }
  return schema.parse(body);
}

export function readQuery<S extends ZodTypeAny>(req: NextRequest, schema: S): z.output<S> {
  return schema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
}

export function isDuplicateKey(e: unknown, field?: string): boolean {
  const err = e as { code?: number; keyPattern?: Record<string, unknown> };
  if (err?.code !== 11000) return false;
  return field ? Boolean(err.keyPattern && field in err.keyPattern) : true;
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Converts lean Mongo docs (ObjectId, Date) into plain JSON-safe objects. */
export function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}
