import Link from "next/link";
import { db } from "@/lib/db";
import { customerAppointments, customerProfile, signOutCustomer } from "@/app/actions/public";
import { getSettings } from "@/lib/settings";
import { formatMoney, timeOf } from "@/lib/time";
import { formatPhone } from "@/lib/phone";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, shopHoursLines } from "@/components/site-footer";
import { OtpForm } from "@/components/otp-form";
import { CancelButton } from "@/components/cancel-button";
import { CalendarDots, Clock, Scissors } from "@/components/icons";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Onaylı",
  done: "Tamamlandı",
  no_show: "Gelmedi",
  cancelled: "İptal",
};

export default async function MyAppointmentsPage() {
  const [phone, settings, barber] = await Promise.all([
    customerProfile(),
    getSettings(),
    db.user.findFirst({
      where: { role: "barber", active: true },
      orderBy: { createdAt: "asc" },
      select: { workHours: true },
    }),
  ]);
  const appointments = phone ? await customerAppointments() : null;
  const hours = shopHoursLines(barber?.workHours ?? []);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader shopName={settings.shopName} />

      <main className="shell w-full max-w-2xl flex-1 py-10 md:py-14">
        <p className="kicker">Randevularım</p>
        <h1 className="mt-1 font-display text-4xl">
          {phone ? "Yaklaşan randevular" : "Randevunu bul"}
        </h1>

        {!phone ? (
          <div className="mt-6">
            <OtpForm />
            <p className="mt-4 text-xs text-muted">
              Telefon doğrulaması, randevunuzu yalnızca sizin görebilmeniz içindir.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted">{formatPhone(phone)}</p>
              <form action={signOutCustomer}>
                <button className="btn btn-sm btn-ghost">Çıkış</button>
              </form>
            </div>

            {!appointments || appointments.length === 0 ? (
              <div className="card px-6 py-12 text-center">
                <CalendarDots
                  size={34}
                  weight="duotone"
                  className="mx-auto text-stone-300"
                  aria-hidden="true"
                />
                <p className="mt-3 font-medium">Yaklaşan randevu yok</p>
                <p className="mt-1 text-sm text-muted">
                  Yeni bir randevu almak birkaç saniye sürer.
                </p>
                <Link href="/randevu" className="btn btn-primary mt-4">
                  Randevu al
                </Link>
              </div>
            ) : (
              <ul className="space-y-3">
                {appointments.map((appointment) => {
                  const cancellable =
                    appointment.status === "confirmed" && appointment.start > new Date();
                  return (
                    <li key={appointment.id} className="card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="flex items-center gap-1.5 font-display text-2xl leading-tight">
                            <Clock size={16} weight="bold" className="text-brass" aria-hidden="true" />
                            {new Intl.DateTimeFormat("tr-TR", {
                              day: "numeric",
                              month: "long",
                              weekday: "long",
                              timeZone: "Europe/Istanbul",
                            }).format(appointment.start)}{" "}
                            · {timeOf(appointment.start)}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                            <Scissors size={14} aria-hidden="true" />
                            {appointment.service?.name ?? "Hizmet"} · {appointment.barber.name}
                            {appointment.service && ` · ${formatMoney(appointment.service.price)}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`badge badge-${appointment.status}`}>
                            {STATUS_LABEL[appointment.status] ?? appointment.status}
                          </span>
                          {cancellable && <CancelButton id={appointment.id} />}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/randevu" className="btn btn-outline btn-sm">
                Yeni randevu
              </Link>
              <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="btn btn-ghost btn-sm">
                Dükkânı ara
              </a>
            </div>
          </div>
        )}
      </main>

      <SiteFooter settings={settings} hours={hours} />
    </div>
  );
}
