import { formatMin } from "./time";

export type DayHours = {
  weekday: number;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
  on: boolean;
};

export type WorkSegment = { weekday: number; startMin: number; endMin: number };

export function toDayHours(weekday: number, segments: WorkSegment[]): DayHours {
  const base: DayHours = {
    weekday,
    start: "09:00",
    end: "20:00",
    breakStart: "",
    breakEnd: "",
    on: false,
  };
  if (segments.length === 0) return base;

  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin);
  if (sorted.length === 1) {
    return {
      ...base,
      on: true,
      start: formatMin(sorted[0].startMin),
      end: formatMin(sorted[0].endMin),
    };
  }
  return {
    ...base,
    on: true,
    start: formatMin(sorted[0].startMin),
    end: formatMin(sorted[sorted.length - 1].endMin),
    breakStart: formatMin(sorted[0].endMin),
    breakEnd: formatMin(sorted[sorted.length - 1].startMin),
  };
}

export function defaultDays(): DayHours[] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    start: "09:00",
    end: "20:00",
    breakStart: "13:00",
    breakEnd: "13:30",
    on: weekday !== 1,
  }));
}

export function buildDays(segments: WorkSegment[]): DayHours[] {
  if (segments.length === 0) return defaultDays();
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) =>
    toDayHours(weekday, segments.filter((s) => s.weekday === weekday)),
  );
}
