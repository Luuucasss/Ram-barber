"use client";

/** localStorage keys shared with /mis-turnos and /turno/[token]. */
export const STORAGE_KEYS = { phone: "ram_tel", name: "ram_nombre", bookings: "ram_turnos" } as const;

export type StoredBooking = { token: string; date: string; start: string };

// Storage can throw (Safari private mode, blocked cookies, quota): every access is guarded.
export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function readStoredBookings(): StoredBooking[] {
  try {
    const parsed: unknown = JSON.parse(readStorage(STORAGE_KEYS.bookings) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is StoredBooking =>
        typeof b === "object" && b !== null && typeof b.token === "string" && typeof b.date === "string",
    );
  } catch {
    return [];
  }
}

export function appendStoredBooking(entry: StoredBooking) {
  const list = readStoredBookings().filter((b) => b.token !== entry.token);
  list.push(entry);
  // Keep the list bounded so it never grows forever on a shared device.
  writeStorage(STORAGE_KEYS.bookings, JSON.stringify(list.slice(-20)));
}
