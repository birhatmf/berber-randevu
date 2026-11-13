import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { listDay } from "@/lib/booking";
import { formatPhone } from "@/lib/phone";
import { formatDateLong, formatDateShort, formatMoney, isValidDateKey, localDateTime, timeOf, todayKey, dateKey } from "@/lib/time";
import { DayNav } from "@/components/day-nav";
import { AddAppointment } from "@/components/add-appointment";
import { AppointmentItem, EmptyDay, type AppointmentItemData } from "@/components/appointment-item";
import { CalendarDots, Clock, Users, Warning } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; barber?: string }>;
}) {
  const user = await requireUser();
  if (!user) return null;

  const params = await searchParams;
  const date = params.date && isValidDateKey(params.date) ? params.date : todayKey();
  const barberFilter = user.role === "admin" ? params.barber : user.id;

  const [barbers, services, appointments, upcoming] = await Promise.all([
    db.user.findMany({
      where: { role: "barber", active: true, ...(user.role === "admin" ? {} : { id: user.id }) },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, title: true },
    }),
    db.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, durationMin: true },
    }),
    listDay(date, barberFilter),
    db.appointment.findMany({
      where: {
        type: "appointment",
        status: { not: "cancelled" },
        start: { gte: new Date(localDateTime(date, 0).getTime() + 86_400_000) },
        ...(barberFilter ? { barberId: barberFilter } : {}),
      },
      orderBy: { start: "asc" },
      take: 5,
      include: { service: { select: { name: true } }, barber: { select: { name: true } } },
    }),
  ]);

  const items: AppointmentItemData[] = appointments.map((a) => ({
    id: a.id,
    start: a.start.toISOString(),
    end: a.end.toISOString(),
    customerName: a.customerName,
    customerPhone: a.customerPhone,
    status: a.status,
    type: a.type,
    source: a.source,
    note: a.note,
    serviceName: a.service?.name ?? null,
    barberName: a.barber.name,
  }));

  const real = items.filter((i) => i.type === "appointment");
  const done = real.filter((i) => i.status === "done").length;
  const noShow = real.filter((i) => i.status === "no_show").length;
  const revenue = appointments
    .filter((a) => a.status === "done" && a.type === "appointment")
    .reduce((sum, a) => sum + (a.service?.price ?? 0), 0);

  const grouped = barbers.map((b) => ({
    barber: b,
    items: items.filter((i) => i.barberName === b.name),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="kicker">Panel</p>
          <DayNav date={date} basePath="/panel" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/panel/takvim" className="btn btn-outline btn-sm">
            <CalendarDots size={16} weight="bold" aria-hidden="true" />
            Takvim
          </Link>
          {barbers.length > 0 && services.length > 0 && (
            <AddAppointment
              barbers={barbers.map((b) => ({ id: b.id, name: b.name }))}
              services={services.map((s) => ({ id: s.id, name: `${s.name} · ${s.durationMin} dk` }))}
              date={date}
              defaultBarberId={barberFilter ?? barbers[0]?.id}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Randevu" value={String(real.length)} hint={`${done} tamamlandı`} />
        <Metric
          label="Bekleyen"
          value={String(real.filter((i) => i.status === "confirmed").length)}
          hint="onaylı, henüz gelmedi"
        />
        <Metric
          label="Gelmedi"
          value={String(noShow)}
          hint={noShow > 0 ? "takip et" : "temiz"}
          tone={noShow > 0 ? "warn" : undefined}
        />
        <Metric label="Ciro (geldi)" value={formatMoney(revenue)} hint="hizmet bedeli" />
      </div>

      {user.role === "admin" && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/panel?date=${date}`}
            className={`btn btn-sm ${!params.barber ? "btn-primary" : "btn-outline"}`}
          >
            Tümü
          </Link>
          {barbers.map((b) => (
            <Link
              key={b.id}
              href={`/panel?date=${date}&barber=${b.id}`}
              className={`btn btn-sm ${params.barber === b.id ? "btn-primary" : "btn-outline"}`}
            >
              {b.name.split(" ")[0]}
            </Link>
          ))}
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl">Sıradaki randevular</h2>
            <Link href={`/panel?date=${dateKey(upcoming[0].start)}`} className="text-xs font-semibold text-brass hover:underline">
              Günü aç →
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-line">
            {upcoming.map((appointment) => (
              <li key={appointment.id}>
                <Link
                  href={`/panel?date=${dateKey(appointment.start)}${params.barber ? `&barber=${params.barber}` : ""}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm hover:text-brass"
                >
                  <span className="w-24 shrink-0 font-semibold tabular-nums">
                    {formatDateShort(dateKey(appointment.start))}
                  </span>
                  <span className="w-14 shrink-0 tabular-nums text-muted">
                    {timeOf(appointment.start)}
                  </span>
                  <span className="font-medium">{appointment.customerName}</span>
                  <span className="text-muted">
                    {appointment.service?.name ?? "—"} · {appointment.barber.name}
                  </span>
                  <span className="ml-auto text-xs text-muted">
                    {appointment.customerPhone ? formatPhone(appointment.customerPhone) : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length === 0 ? (
        <EmptyDay />
      ) : params.barber || user.role !== "admin" ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <AppointmentItem key={item.id} item={item} />
          ))}
        </ul>
      ) : (
        <div className="space-y-7">
          {grouped.map(({ barber, items: list }) => (
            <section key={barber.id}>
              <div className="mb-2 flex items-baseline justify-between border-b border-line pb-1">
                <h2 className="flex items-center gap-2 text-lg">
                  <Users size={16} weight="bold" className="text-brass" aria-hidden="true" />
                  {barber.name}
                  <span className="text-sm font-normal text-muted">{barber.title}</span>
                </h2>
                <span className="text-xs text-muted">{list.length} kayıt</span>
              </div>
              {list.length === 0 ? (
                <p className="py-3 text-sm text-muted">Boş gün.</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((item) => (
                    <AppointmentItem key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted">
        <Clock size={13} aria-hidden="true" />
        {formatDateLong(date)} · İstanbul saatiyle
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "warn";
}) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "warn" ? "text-danger" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted">
        {tone === "warn" && <Warning size={12} weight="bold" aria-hidden="true" />}
        {hint}
      </p>
    </div>
  );
}
