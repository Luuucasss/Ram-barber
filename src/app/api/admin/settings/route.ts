import { z } from "zod";
import { ApiError, ok, readJson, route } from "@/lib/api";
import { getSettings, saveSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = route(async () => ok(await getSettings()), { admin: true });

export const PUT = route(
  async (req) => {
    const input = settingsSchema.parse(await readJson(req, z.unknown()));
    const { cardSize, steps } = input.loyalty;
    const positions = steps.map((s) => s.position);
    if (new Set(positions).size !== positions.length) {
      throw new ApiError(400, "invalid_loyalty", "Hay dos beneficios en la misma posición de la tarjeta.");
    }
    if (positions.some((p) => p > cardSize)) {
      throw new ApiError(400, "invalid_loyalty", `Los beneficios tienen que estar entre el sello 1 y el ${cardSize}.`);
    }
    input.loyalty.steps = [...steps].sort((a, b) => a.position - b.position);
    input.whatsapp = input.whatsapp.replace(/\D/g, "");
    input.instagram = input.instagram.replace(/^@+/, "");
    return ok(await saveSettings(input));
  },
  { admin: true },
);
