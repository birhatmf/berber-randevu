import Link from "next/link";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { todayKey } from "@/lib/time";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, shopHoursLines } from "@/components/site-footer";
import { BookingWizard } from "@/components/booking-wizard";
import { Scissors } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function BookingPage() {
  const [settings, services, barbers] = await Promise.all([
    getSettings(),
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.user.findMany({
      where: { role: "barber", active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, title: true, workHours: true },
    }),
  ]);

  const maxDays = Math.max(1, Number(settings.maxDays) || 60);
  const hours = shopHoursLines(barbers[0]?.workHours ?? []);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader shopName={settings.shopName} />

      <main className="shell w-full flex-1 py-10 md:py-14">
        {services.length === 0 || barbers.length === 0 ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <Scissors size={40} weight="duotone" className="mx-auto text-stone-300" aria-hidden="true" />
            <h1 className="mt-3 font-display text-3xl">Randevu şu an kapalı</h1>
            <p className="mt-2 text-sm text-muted">
              Hizmet ve berber tanımları tamamlanınca randevu alınabilir. Lütfen bizi arayın:{" "}
              {settings.phone}
            </p>
            <Link href="/" className="btn btn-outline mt-5">
              Ana sayfa
            </Link>
          </div>
        ) : (
          <BookingWizard
            services={services.map((s) => ({
              id: s.id,
              name: s.name,
              durationMin: s.durationMin,
              price: s.price,
            }))}
            barbers={barbers.map((b) => ({ id: b.id, name: b.name, title: b.title }))}
            today={todayKey()}
            maxDays={maxDays}
            phone={settings.phone}
          />
        )}
      </main>

      <SiteFooter settings={settings} hours={hours} />
    </div>
  );
}
