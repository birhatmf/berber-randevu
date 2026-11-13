import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/time";
import { ServiceForm } from "@/components/service-form";
import { toggleService } from "@/app/actions/panel";

export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/panel");

  const params = await searchParams;
  const services = await db.service.findMany({ orderBy: { sortOrder: "asc" } });
  const editing = params.edit ? services.find((s) => s.id === params.edit) : undefined;

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">Yönetim</p>
        <h1 className="font-display text-3xl">Hizmetler</h1>
        <p className="mt-1 text-sm text-muted">
          Süre ve fiyat, randevu akışındaki saatleri doğrudan belirler.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
        <ul className="card divide-y divide-line">
          {services.map((service) => (
            <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className={`font-medium ${service.active ? "" : "text-muted line-through"}`}>
                  {service.name}
                </p>
                <p className="text-xs text-muted">
                  {service.durationMin} dk · {formatMoney(service.price)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={`/panel/hizmetler?edit=${service.id}`}
                  className="btn btn-sm btn-outline"
                >
                  Düzenle
                </Link>
                <form action={toggleService}>
                  <input type="hidden" name="id" value={service.id} />
                  <button className="btn btn-sm btn-ghost">
                    {service.active ? "Gizle" : "Yayınla"}
                  </button>
                </form>
              </div>
            </li>
          ))}
          {services.length === 0 && <li className="p-6 text-sm text-muted">Henüz hizmet yok.</li>}
        </ul>

        <ServiceForm key={editing?.id ?? "new"} service={editing} />
      </div>
    </div>
  );
}
