import Link from "next/link";
import { addDays, dateKey, formatDateShort, formatMin, formatMoney, timeOf, todayKey, weekdayOf, WEEKDAYS_SHORT } from "@/lib/time";

type Barber = { id: string; name: string };
type Row = {
  id: string;
  start: Date;
  end: Date;
  customerName: string;
  status: string;
  type: string;
  serviceName: string | null;
  servicePrice: number | null;
  barberId: string;
  barberName: string;
};

const STATUS_STYLE: Record<string, string> = {
  pending: "border-l-[3px] border-l-amber-500 bg-amber-50 text-amber-950",
  confirmed: "border-l-[3px] border-l-indigo-500 bg-indigo-50 text-indigo-950",
  done: "border-l-[3px] border-l-emerald-600 bg-emerald-50 text-emerald-950",
  no_show: "border-l-[3px] border-l-red-600 bg-red-50 text-red-950",
  cancelled: "border-l-[3px] border-l-stone-300 bg-stone-50 text-stone-500 line-through",
};

export function DayGrid({
  date,
  barbers,
  rows,
}: {
  date: string;
  barbers: Barber[];
  rows: Row[];
}) {
  const dayStart = 9 * 60;
  const dayEnd = 20 * 60;
  const pxPerMin = 1.05;

  const totalHeight = (dayEnd - dayStart) * pxPerMin + 18;
  const hours = Array.from({ length: (dayEnd - dayStart) / 60 + 1 }, (_, i) => dayStart + i * 60);

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[560px]">
        <div
          className="grid border-b border-line bg-stone-50/80"
          style={{ gridTemplateColumns: `58px repeat(${barbers.length}, minmax(140px, 1fr))` }}
        >
          <div />
          {barbers.map((b) => (
            <div key={b.id} className="border-l border-line px-2 py-2 text-sm font-semibold">
              {b.name.split(" ")[0]}
            </div>
          ))}
        </div>

        <div className="relative" style={{ height: totalHeight }}>
          {hours.map((h) => (
            <div
              key={h}
              className="absolute inset-x-0 flex items-start"
              style={{ top: (h - dayStart) * pxPerMin }}
            >
              <span className="w-[58px] -translate-y-1/2 pr-2 text-right text-[11px] tabular-nums text-muted">
                {formatMin(h)}
              </span>
              <span className="flex-1 border-t border-line" />
            </div>
          ))}

          <div
            className="absolute inset-y-0 right-0 grid"
            style={{
              left: 58,
              gridTemplateColumns: `repeat(${barbers.length}, minmax(140px, 1fr))`,
            }}
          >
            {barbers.map((b) => (
              <div key={b.id} className="relative border-l border-line">
                {rows
                  .filter((r) => r.barberId === b.id)
                  .map((r) => {
                    const startMin = Math.max(dayStart, minutesFromDate(r.start));
                    const endMin = Math.min(dayEnd, minutesFromDate(r.end));
                    if (endMin <= dayStart || startMin >= dayEnd) return null;
                    return (
                      <Link
                        key={r.id}
                        href={`/panel?date=${date}`}
                        className={`absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-0.5 text-[11px] leading-tight ${
                          r.type === "block"
                            ? "border border-dashed border-stone-300 bg-stone-100 text-stone-500"
                            : STATUS_STYLE[r.status] ?? STATUS_STYLE.confirmed
                        }`}
                        style={{
                          top: (startMin - dayStart) * pxPerMin,
                          height: Math.max(20, (endMin - startMin) * pxPerMin - 2),
                        }}
                        title={`${timeOf(r.start)} ${r.type === "block" ? "Bloke" : r.customerName}`}
                      >
                        <span className="font-semibold tabular-nums">{timeOf(r.start)}</span>{" "}
                        {r.type === "block" ? "—" : r.customerName.split(" ")[0]}
                      </Link>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WeekGrid({
  weekStart,
  rows,
}: {
  weekStart: string;
  rows: Row[];
}) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="card overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7">
        {days.map((day) => {
          const dayRows = rows.filter((r) => dateKey(r.start) === day);
          const isToday = day === today;
          return (
            <div key={day} className="min-h-[380px] border-l border-line first:border-l-0">
              <Link
                href={`/panel/takvim?view=day&date=${day}`}
                className={`flex items-baseline justify-between px-2 py-2 text-sm ${
                  isToday ? "bg-ink text-cream" : "bg-stone-50/80 hover:bg-stone-100"
                }`}
              >
                <span className="font-semibold">{formatDateShort(day)}</span>
                <span className={isToday ? "text-brass-light" : "text-muted"}>
                  {WEEKDAYS_SHORT[weekdayOf(day)]}
                </span>
              </Link>
              <ul className="space-y-1 p-1.5">
                {dayRows.length === 0 && <li className="px-1 py-2 text-[11px] text-muted">—</li>}
                {dayRows.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/panel?date=${day}`}
                      className={`block rounded px-1.5 py-1 text-[11px] leading-tight ${
                        r.type === "block"
                          ? "bg-stone-100 text-stone-500"
                          : STATUS_STYLE[r.status] ?? STATUS_STYLE.confirmed
                      }`}
                    >
                      <span className="font-semibold tabular-nums">{timeOf(r.start)}</span>{" "}
                      {r.type === "block" ? "Bloke" : r.customerName.split(" ")[0]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MonthGrid({
  monthStart,
  rows,
}: {
  monthStart: string;
  rows: Row[];
}) {
  const first = monthStart;
  const lead = (weekdayOf(first) + 6) % 7;
  const gridStart = addDays(first, -lead);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const month = first.slice(0, 7);
  const today = todayKey();

  return (
    <div className="card overflow-x-auto">
      <div className="grid min-w-[620px] grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="border-b border-line bg-stone-50/80 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {WEEKDAYS_SHORT[(i + 1) % 7]}
          </div>
        ))}
        {days.map((day) => {
          const dayRows = rows.filter((r) => dateKey(r.start) === day);
          const inMonth = day.slice(0, 7) === month;
          const revenue = dayRows.reduce((s, r) => s + (r.status === "done" ? (r.servicePrice ?? 0) : 0), 0);
          return (
            <Link
              key={day}
              href={`/panel/takvim?view=day&date=${day}`}
              className={`min-h-[92px] border-b border-l border-line p-1.5 text-[11px] transition-colors hover:bg-stone-50 ${
                inMonth ? "" : "bg-stone-50/40 text-stone-400"
              } ${day === today ? "bg-brass-light/20" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-semibold ${day === today ? "text-brass" : ""}`}>
                  {Number(day.slice(8))}
                </span>
                {dayRows.length > 0 && (
                  <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-cream">
                    {dayRows.length}
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-muted">
                {dayRows.slice(0, 2).map((r) => timeOf(r.start)).join(" · ")}
              </p>
              {revenue > 0 && <p className="mt-0.5 font-semibold text-emerald-700">{formatMoney(revenue)}</p>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function minutesFromDate(d: Date): number {
  return Number(timeOf(d).slice(0, 2)) * 60 + Number(timeOf(d).slice(3, 5));
}
