/**
 * Normalizes an Argentine phone to 10 digits (area code + number, no 0, no 15).
 * Accepts inputs like "+54 9 351 555-1234", "0351 5551234", "3515551234".
 */
export function normalizePhone(input: string): string | null {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("549") && d.length === 13) d = d.slice(3);
  else if (d.startsWith("54") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return /^[1-9]\d{9}$/.test(d) ? d : null;
}

export function formatPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
}

export function whatsappLink(phoneOrIntl: string, text?: string): string {
  const digits = phoneOrIntl.replace(/\D/g, "");
  const intl = digits.length === 10 ? `549${digits}` : digits;
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
