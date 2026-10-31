"use client";

/**
 * Device-local memory for the public site. Every access is wrapped: storage can be
 * missing or throw (private mode, blocked site data, embedded previews).
 */
export const PHONE_KEY = "ram_tel";
export const BOOKINGS_KEY = "ram_turnos";
const MAX_SAVED = 20;

export type SavedBooking = { token: string; date: string; start: string };

export function readPhone(): string {
  try {
    return window.localStorage.getItem(PHONE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePhone(phone: string) {
  try {
    window.localStorage.setItem(PHONE_KEY, phone);
  } catch {
    /* ignore */
  }
}

function isSaved(v: unknown): v is SavedBooking {
  const o = v as SavedBooking;
  return (
    !!o &&
    typeof o.token === "string" &&
    o.token.length > 0 &&
    typeof o.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
    typeof o.start === "string"
  );
}

export function readSavedBookings(): SavedBooking[] {
  try {
    const raw = window.localStorage.getItem(BOOKINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSaved) : [];
  } catch {
    return [];
  }
}

function writeSaved(list: SavedBooking[]) {
  try {
    window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(list.slice(-MAX_SAVED)));
  } catch {
    /* ignore */
  }
}

/** Adds or refreshes a booking remembered on this device (e.g. after rescheduling). */
export function upsertSavedBooking(entry: SavedBooking) {
  const list = readSavedBookings().filter((b) => b.token !== entry.token);
  list.push({ token: entry.token, date: entry.date, start: entry.start });
  writeSaved(list);
}

export function removeSavedBooking(token: string) {
  const list = readSavedBookings();
  const next = list.filter((b) => b.token !== token);
  if (next.length !== list.length) writeSaved(next);
}

/** Today's date (YYYY-MM-DD) on this device. Only a fallback when the server didn't tell us. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
