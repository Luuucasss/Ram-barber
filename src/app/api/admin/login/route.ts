import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";
import { ApiError, clientIp, ok, readJson, route } from "@/lib/api";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const digest = (s: string) => createHash("sha256").update(s).digest();

export const POST = route(async (req) => {
  await rateLimit(`login:${clientIp(req)}`, 8, 15 * 60, "Demasiados intentos. Esperá 15 minutos.");
  const { password } = await readJson(req, z.object({ password: z.string().min(1).max(200) }));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new ApiError(500, "not_configured", "Falta configurar ADMIN_PASSWORD en el servidor.");
  if (!timingSafeEqual(digest(password), digest(expected))) {
    throw new ApiError(401, "invalid_credentials", "Contraseña incorrecta.");
  }
  const res = ok({ loggedIn: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);
  return res;
});
