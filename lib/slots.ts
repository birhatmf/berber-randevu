import { dateKey, diffDays, isValidDateKey, minutesOfDay } from "./time";

export type Interval = { startMin: number; endMin: number };

export type SlotInput = {
  segments: Interval[];
  busy: Interval[];
  durationMin: number;
  stepMin: number;
  dateStr: string;
  now: Date;
  minLeadMin: number;
  maxDays: number;
};

export function computeSlots(input: SlotInput): number[] {
  const { segments, busy, durationMin, stepMin, dateStr, now, minLeadMin, maxDays } = input;
  if (!isValidDateKey(dateStr) || durationMin <= 0 || stepMin <= 0) return [];

  const dayDiff = diffDays(dateKey(now), dateStr);
  if (dayDiff < 0 || dayDiff > maxDays) return [];

  const earliest = dayDiff === 0 ? minutesOfDay(now) + minLeadMin : 0;
  const slots: number[] = [];

  for (const seg of segments) {
    for (let start = seg.startMin; start + durationMin <= seg.endMin; start += stepMin) {
      if (start < earliest) continue;
      if (busy.some((b) => start < b.endMin && start + durationMin > b.startMin)) continue;
      if (!slots.includes(start)) slots.push(start);
    }
  }
  return slots.sort((a, b) => a - b);
}

export function overlaps(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
): boolean {
  return a.start < b.end && a.end > b.start;
}
