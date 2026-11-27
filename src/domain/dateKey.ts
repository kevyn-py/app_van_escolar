/**
 * Datas operacionais. Sempre usam o fuso horário local do dispositivo (RNF-09),
 * nunca UTC, para evitar virada prematura do dia.
 */

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const d = parseDateKey(value);
  return toDateKey(d) === value;
}

/** Converte YYYY-MM-DD para um Date à meia-noite local. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

/** Datas estritamente anteriores a hoje são imutáveis (RN-09). */
export function isPastDateKey(key: string, todayKey: string = toDateKey()): boolean {
  return key < todayKey;
}

/** "26/11/2026" */
export function formatDateShort(key: string): string {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Quinta-feira" */
export function formatWeekday(key: string): string {
  return capitalize(new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(parseDateKey(key)));
}

/** "Quinta-feira, 26/11/2026" */
export function formatDateLong(key: string): string {
  return `${formatWeekday(key)}, ${formatDateShort(key)}`;
}

/** "07:12" no horário local. */
export function formatTime(date: Date | null | undefined): string {
  if (!date) return "";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
