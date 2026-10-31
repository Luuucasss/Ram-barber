import { dateChip } from "@/lib/format";

/** "Jue 30/10" */
export function shortDate(dateISO: string) {
  const { day } = dateChip(dateISO);
  const [, m, d] = dateISO.split("-");
  return `${day} ${d}/${m}`;
}

/** "30/10/2026" */
export function numericDate(dateISO: string) {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}

/** "30/10 14:05" from an ISO timestamp, in the viewer's local time. */
export function stamp(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "hace 3 días", "hoy", … relative to `todayISO`, for last-visit style columns. */
export function sinceDays(iso: string | null | undefined, todayISO: string) {
  if (!iso) return "—";
  const days = Math.round((Date.parse(`${todayISO}T12:00:00Z`) - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.round(days / 30);
  if (months < 12) return `hace ${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.round(days / 365);
  return `hace ${years} ${years === 1 ? "año" : "años"}`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}
