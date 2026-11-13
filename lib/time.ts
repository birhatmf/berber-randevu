export const TZ_OFFSET_MIN = 180; // Türkiye UTC+3, yaz saati yok
const DAY = 86_400_000;

export function dateKey(d: Date): string {
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function isValidDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function weekdayOf(dateStr: string): number {
  return new Date(dateStr + "T00:00:00Z").getUTCDay();
}

export function minutesOfDay(d: Date): number {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function localDateTime(dateStr: string, minutes: number): Date {
  return new Date(Date.parse(dateStr + "T00:00:00Z") + (minutes - TZ_OFFSET_MIN) * 60_000);
}

export function addDays(dateStr: string, n: number): string {
  return new Date(Date.parse(dateStr + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  return Math.round(
    (Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / DAY,
  );
}

export function formatMin(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatMoney(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(kurus / 100);
}

export function formatDateLong(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "long",
    timeZone: "Europe/Istanbul",
  }).format(new Date(dateStr + "T12:00:00Z"));
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(dateStr + "T12:00:00Z"));
}

export function timeOf(d: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(d);
}

export function dateTimeOf(d: Date): string {
  return `${new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    weekday: "short",
    timeZone: "Europe/Istanbul",
  }).format(d)} · ${timeOf(d)}`;
}

export const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export const WEEKDAYS_SHORT = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
