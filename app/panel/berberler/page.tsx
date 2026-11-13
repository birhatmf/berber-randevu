import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatPhone } from "@/lib/phone";
import { todayKey } from "@/lib/time";
import { BarberForm } from "@/components/barber-form";
import { WorkHoursForm } from "@/components/work-hours-form";
import { toDayHours } from "@/lib/workhours";
import { toggleBarber } from "@/app/actions/panel";

export const dynamic = "force-dynamic";

export default async function BarbersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/panel");

  const params = await searchParams;
  const barbers = await db.user.findMany({
    where: { role: "barber" },
    orderBy: { createdAt: "asc" },
    include: { workHours: true },
  });

  const editing = params.edit ? barbers.find((b) => b.id === params.edit) : undefined;
  const hours = editing
    ? [0, 1, 2, 3, 4, 5, 6].map((weekday) =>
        toDayHours(weekday, editing.workHours.filter((h) => h.weekday === weekday)),
      )
    : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Yönetim</p>
        <h1 className="font-display text-3xl">Berberler</h1>
        <p className="mt-1 text-sm text-muted">
          Berber ekleyin, giriş bilgilerini ve çalışma saatlerini yönetin.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <ul className="card divide-y divide-line">
          {barbers.map((barber) => (
            <li key={barber.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                {barber.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={barber.photo}
                    alt={barber.name}
                    className="size-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-ink font-display text-lg text-cream">
                    {barber.name.charAt(0)}
                  </span>
                )}
                <div>
                  <p className="font-medium">
                    {barber.name}
                    {!barber.active && <span className="ml-2 text-xs text-danger">pasif</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {barber.title ?? "Berber"} · {formatPhone(barber.phone)} · {barber.workHours.length / 2} gün
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/panel/berberler?edit=${barber.id}`}
                  className="btn btn-sm btn-outline"
                >
                  Düzenle
                </Link>
                <form action={toggleBarber}>
                  <input type="hidden" name="id" value={barber.id} />
                  <button className="btn btn-sm btn-ghost">
                    {barber.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                </form>
              </div>
            </li>
          ))}
          {barbers.length === 0 && (
            <li className="p-6 text-sm text-muted">Henüz berber yok.</li>
          )}
        </ul>

        <div className="space-y-4">
          <BarberForm key={editing?.id ?? "new"} barber={editing} />
          {editing && <WorkHoursForm key={`${editing.id}-hours`} barberId={editing.id} days={hours} />}
        </div>
      </div>

      <p className="text-xs text-muted">
        İpucu: Bugünün ekranına dönmek için{" "}
        <Link href={`/panel?date=${todayKey()}`} className="underline">
          buraya
        </Link>{" "}
        dokunun.
      </p>
    </div>
  );
}
