/**
 * CPF (Brazilian tax id) formatting helpers. Two entry points:
 *
 *   - `formatCpf(raw)` — best-effort "999.888.777-00" format. Strips
 *     every non-digit, keeps the first 11, then applies the mask.
 *     If the input has fewer than 11 digits it partially masks what
 *     it got so the typed field reads naturally mid-entry.
 *   - `normalizeCpfForStorage(raw)` — what the server action writes
 *     to the DB. Identical to `formatCpf` but returns an empty string
 *     when fewer than 11 digits (so blank/invalid input stays null).
 *
 * We always print the masked form on the certificate, whether the
 * teacher typed it with dots or as bare digits.
 */

function digits(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D+/g, "");
}

export function formatCpf(raw: string | null | undefined): string {
  const d = digits(raw).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function normalizeCpfForStorage(
  raw: string | null | undefined,
): string | null {
  const d = digits(raw).slice(0, 11);
  if (d.length !== 11) return null;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}
