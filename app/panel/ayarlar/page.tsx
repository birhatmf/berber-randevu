import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { buildDays } from "@/lib/workhours";
import { SettingsForm } from "@/components/settings-form";
import { WorkHoursForm } from "@/components/work-hours-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/panel");

  const [settings, barber] = await Promise.all([
    getSettings(),
    db.user.findFirst({
      where: { role: "barber", active: true },
      orderBy: { createdAt: "asc" },
      select: { workHours: true },
    }),
  ]);

  const days = buildDays(
    (barber?.workHours ?? []).map((h) => ({
      weekday: h.weekday,
      startMin: h.startMin,
      endMin: h.endMin,
    })),
  );

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="kicker">CMS</p>
        <h1 className="font-display text-3xl">Site alanları</h1>
        <p className="mt-1 text-sm text-muted">
          Sitedeki tüm metinler ve fotoğraflar. Sayfa üzerinde tıklayarak düzenlemek için{" "}
          <Link href="/panel/site" className="underline">
            Site
          </Link>{" "}
          önizlemesini kullanın.
        </p>
      </div>

      <WorkHoursForm scope="shop" days={days} />

      <p className="text-xs text-muted">
        Berber bazında farklı saat vermek için{" "}
        <Link href="/panel/berberler" className="underline">
          Berberler
        </Link>{" "}
        sayfasında berberi düzenleyin.
      </p>

      <SettingsForm settings={settings} />
    </div>
  );
}
