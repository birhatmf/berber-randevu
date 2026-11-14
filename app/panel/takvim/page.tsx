import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { listDay, listRange } from "@/lib/booking";
import {
  addDays,
  dateKey,
  formatDateShort,
  formatMin,
  isValidDateKey,
  todayKey,
  weekdayOf,
} from "@/lib/time";
import { DayGrid, MonthGrid, WeekGrid } from "@/components/calendar-views";
import { CaretLeft, CaretRight } from "@/components/icons";

export const dynamic = "force-dynamic";

type View = "day" | "week" | "month";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; barber?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const view: View = params.view === "week" || params.view === "month" ? params.view : "day";
  const date = params.date && isValidDateKey(params.date) ? params.date : todayKey();
  const barberFilter = user.role === "admin" ? params.barber : user.id;

  const barbers = await db.user.findMany({
    where: { role: "barber", active: true, ...(user.role === "admin" ? {} : { id: user.id }) },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const weekStart = addDays(date, -((weekdayOf(date) + 6) % 7));
  const monthStart = `${date.slice(0, 7)}-01`;

  const raw =
    view === "day"
      ? await listDay(date, barberFilter)
      : view === "week"
        ? await listRange(weekStart, addDays(weekStart, 6), barberFilter)
        : await listRange(addDays(monthStart, -7), addDays(monthStart, 42), barberFilter);

  const rows = raw.map((a) => ({
    id: a.id,
    start: a.start,
    end: a.end,
    customerName: a.customerName,
    status: a.status,
    type: a.type,
    serviceName: a.service?.name ?? null,
    servicePrice: a.service?.price ?? null,
    barberId: a.barberId,
    barberName: a.barber.name,
  }));

  const step = view === "day" ? 1 : view === "week" ? 7 : 0;
  const prev = step ? addDays(date, -step) : shiftMonth(date, -1);
  const next = step ? addDays(date, step) : shiftMonth(date, 1);

  const title =
    view === "month"
      ? new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
          new Date(monthStart + "T12:00:00Z"),
        )
      : view === "week"
        ? `${formatDateShort(weekStart)} – ${formatDateShort(addDays(weekStart, 6))}`
        : new Intl.DateTimeFormat("tr-TR", {
            day: "numeric",
            month: "long",
            weekday: "long",
            timeZone: "UTC",
          }).format(new Date(date + "T12:00:00Z"));

  const link = (v: View, d: string, barber?: string) =>
    `/panel/takvim?view=${v}&date=${d}${barber ? `&barber=${barber}` : ""}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kicker">Takvim</p>
          <h1 className="font-display text-3xl">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-line bg-white p-0.5">
            {(["day", "week", "month"] as View[]).map((v) => (
              <Link
                key={v}
                href={link(v, date, params.barber)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v ? "bg-ink text-white" : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {v === "day" ? "Gün" : v === "week" ? "Hafta" : "Ay"}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <Link
              href={link(view, prev, params.barber)}
              className="btn btn-outline btn-sm"
              aria-label="Önceki"
            >
              <CaretLeft size={16} weight="bold" aria-hidden="true" />
            </Link>
            <Link href={link(view, todayKey(), params.barber)} className="btn btn-outline btn-sm">
              Bugün
            </Link>
            <Link
              href={link(view, next, params.barber)}
              className="btn btn-outline btn-sm"
              aria-label="Sonraki"
            >
              <CaretRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      {user.role === "admin" && barbers.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={link(view, date)}
            className={`btn btn-sm ${!params.barber ? "btn-primary" : "btn-outline"}`}
          >
            Tümü
          </Link>
          {barbers.map((b) => (
            <Link
              key={b.id}
              href={link(view, date, b.id)}
              className={`btn btn-sm ${params.barber === b.id ? "btn-primary" : "btn-outline"}`}
            >
              {b.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      )}

      {view === "day" && <DayGrid date={date} barbers={barbers} rows={rows} />}
      {view === "week" && <WeekGrid weekStart={weekStart} rows={rows} />}
      {view === "month" && <MonthGrid monthStart={monthStart} rows={rows} />}

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <Legend className="border-l-amber-500 bg-amber-50" label="Onay bekleyen" />
        <Legend className="border-l-indigo-500 bg-indigo-50" label="Onaylı" />
        <Legend className="border-l-emerald-600 bg-emerald-50" label="Geldi" />
        <Legend className="border-l-red-600 bg-red-50" label="Gelmedi" />
        <Legend className="border-l-stone-300 bg-stone-100" label="İptal / Bloke" />
        <span className="ml-auto hidden sm:inline">
          {rows.length} kayıt · {formatMin(9 * 60)}–{formatMin(20 * 60)} arası gösterilir
        </span>
      </div>

      {view === "day" && rows.length > 0 && (
        <p className="text-xs text-muted">
          Düzenlemek için randevuya dokunun —{" "}
          <Link href={`/panel?date=${date}`} className="underline">
            gün listesine
          </Link>{" "}
          gider.
        </p>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block h-3 w-4 rounded-sm border-l-[3px] ${className}`} />
      {label}
    </span>
  );
}

function shiftMonth(dateStr: string, delta: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + delta);
  return dateKey(new Date(d.getTime() + 12 * 3600 * 1000));
}
