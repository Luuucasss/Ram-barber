import { STATUS_LABEL, type AdminBooking } from "./types";
import { numericDate } from "./fmt";

function cell(v: string | number) {
  let s = String(v ?? "");
  // Neutralize spreadsheet formula injection from user-entered text (names, notes).
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Semicolon-separated with a UTF-8 BOM: opens correctly in Excel with an es-AR locale
 * (where comma is the decimal separator) and keeps accents intact.
 */
export function bookingsToCsv(rows: AdminBooking[]) {
  const head = [
    "Fecha",
    "Hora",
    "Fin",
    "Cliente",
    "Teléfono",
    "Servicio",
    "Barbero",
    "Sucursal",
    "Estado",
    "Precio",
    "Descuento %",
    "Precio final",
    "Membresía",
    "Origen",
    "Notas",
  ];
  const lines = rows.map((b) =>
    [
      numericDate(b.date),
      b.start,
      b.end,
      b.clientName,
      b.clientPhone,
      b.serviceName,
      b.barberName,
      b.branchName,
      STATUS_LABEL[b.status],
      b.price,
      b.discountPercent,
      b.finalPrice,
      b.membershipApplied ? "Sí" : "No",
      b.source === "web" ? "Web" : "Panel",
      b.notes.replace(/\s+/g, " "),
    ]
      .map(cell)
      .join(";"),
  );
  return "﻿" + [head.join(";"), ...lines].join("\r\n");
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
