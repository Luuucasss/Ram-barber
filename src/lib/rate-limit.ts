import { RateLimit } from "./models";
import { ApiError } from "./api";

/** Fixed-window rate limiter backed by MongoDB (works across serverless instances). */
export async function rateLimit(key: string, limit: number, windowSec: number, message?: string) {
  const windowMs = windowSec * 1000;
  const bucket = Math.floor(Date.now() / windowMs);
  const doc = await RateLimit.findOneAndUpdate(
    { key: `${key}:${bucket}` },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) } },
    { upsert: true, new: true },
  ).lean();
  if (doc && doc.count > limit) {
    throw new ApiError(
      429,
      "rate_limited",
      message ?? "Hiciste muchas consultas seguidas. Esperá un rato e intentá de nuevo.",
    );
  }
}
