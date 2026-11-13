import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { availableSlots } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { formatMin, formatMoney, todayKey, WEEKDAYS, weekdayOf } from "@/lib/time";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter, shopHoursLines } from "@/components/site-footer";
import { InlineText } from "@/components/inline-text";
import { InlineImage } from "@/components/inline-image";
import { EditBar } from "@/components/edit-bar";
import { ArrowRight, Clock, MapPin, Scissors, Users } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; embed?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const editable = params.edit === "1" && session?.user?.role === "admin";
  const embedded = params.embed === "1";

  const [content, services, barbers, gallery] = await Promise.all([
    getSettings(),
    db.service.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.user.findMany({
      where: { role: "barber", active: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, title: true, bio: true, photo: true, workHours: true },
    }),
    db.galleryImage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const today = todayKey();
  const shopHours = barbers[0]?.workHours ?? [];
  const hours = shopHoursLines(shopHours);
  const todayHours = shopHours
    .filter((h) => h.weekday === weekdayOf(today))
    .sort((a, b) => a.startMin - b.startMin);

  const shortest = [...services].sort((a, b) => a.durationMin - b.durationMin)[0];
  const earliest = shortest
    ? await findEarliest(barbers.map((b) => ({ id: b.id, name: b.name })), today, shortest.id)
    : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader shopName={content.shopName} variant="overlay" />

      <section className="relative flex min-h-[92svh] flex-col justify-end overflow-hidden bg-ink text-cream">
        {content.heroVideo ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={content.heroVideo}
            poster={content.heroImage || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
        ) : (
          <InlineImage
            k="heroImage"
            src={content.heroImage}
            alt=""
            editable={editable}
            label="Hero fotoğrafı"
            className="absolute inset-0"
            imgClassName="h-full w-full object-cover"
          />
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-ink/55 bg-gradient-to-t from-ink via-ink/85 to-ink/45"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(70% 55% at 15% 60%, rgba(28,25,23,0.75) 0%, transparent 70%)",
          }}
        />

        <div className="relative mx-auto w-full max-w-[1120px] px-5 pb-12 pt-28 md:px-8 md:pb-16">
          <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-end">
            <div className="rise">
              <InlineText
                k="heroEyebrow"
                value={content.heroEyebrow || `${WEEKDAYS[weekdayOf(today)]} · ${content.address}`}
                editable={editable}
                label="Üst satır"
                as="p"
                className="kicker text-brass-light"
              />

              {(content.shopName || editable) && (
                <h1 className="mt-3 font-script text-[clamp(4rem,14vw,8.5rem)] leading-[0.95] drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)]">
                  <InlineText
                    k="shopName"
                    value={content.shopName}
                    editable={editable}
                    label="Firma adı"
                    className="block"
                  />
                </h1>
              )}

              <InlineText
                k="tagline"
                value={content.tagline}
                editable={editable}
                label="Slogan"
                as="p"
                className="mt-4 block font-display text-2xl text-brass-light md:text-3xl"
              />

              <InlineText
                k="heroSubtitle"
                value={content.heroSubtitle}
                editable={editable}
                label="Hero açıklama"
                multiline
                as="p"
                className="mt-3 block max-w-md text-sm leading-relaxed text-stone-300"
              />

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/randevu" className="btn btn-brass">
                  {content.heroPrimaryCta}
                  <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </Link>
                <Link
                  href="/randevum"
                  className="btn border border-white/25 text-cream hover:border-white/50 hover:bg-white/10"
                >
                  {content.heroSecondaryCta}
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-stone-400">
                <span className="flex items-center gap-1.5">
                  <Users size={14} weight="bold" aria-hidden="true" /> {barbers.length} usta
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} weight="bold" aria-hidden="true" /> {content.address}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} weight="bold" aria-hidden="true" />
                  {todayHours.length
                    ? `Bugün ${formatMin(todayHours[0].startMin)}–${formatMin(
                        todayHours[todayHours.length - 1].endMin,
                      )}`
                    : "Bugün kapalıyız"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-ink/50 p-5 backdrop-blur-md">
              <InlineText
                k="availabilityTitle"
                value={content.availabilityTitle}
                editable={editable}
                label="Müsaitlik kartı başlığı"
                as="p"
                className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-brass-light"
              />
              {earliest ? (
                <>
                  <p className="mt-2 font-hero text-4xl leading-none">
                    {formatMin(earliest.startMin)}
                    <span className="ml-1 font-sans text-xs font-normal text-stone-400">
                      en erken
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-stone-300">
                    {earliest.barberName} · {shortest.name} · {shortest.durationMin} dk ·{" "}
                    {formatMoney(shortest.price)}
                  </p>
                  <Link href="/randevu" className="btn btn-brass mt-4 w-full">
                    Bu saati al
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-2 font-hero text-4xl leading-none">Bugün dolu</p>
                  <p className="mt-2 text-xs text-stone-300">
                    Sonraki günler için saat seçebilirsiniz.
                  </p>
                  <Link href="/randevu" className="btn btn-brass mt-4 w-full">
                    Yarın için bak
                  </Link>
                </>
              )}

              <div className="mt-4 space-y-1 border-t border-white/10 pt-3 text-[11px] text-stone-400">
                {hours.slice(1, 4).map((h) => (
                  <div key={h.label} className="flex justify-between">
                    <span>{h.label}</span>
                    <span className="tabular-nums">{h.value}</span>
                  </div>
                ))}
                <Link href="#iletisim" className="inline-block pt-1 text-brass-light hover:underline">
                  Tüm saatler →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="hizmetler" className="shell py-16 md:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <InlineText
              k="servicesKicker"
              value={content.servicesKicker}
              editable={editable}
              label="Hizmetler üst başlık"
              as="p"
              className="kicker block"
            />
            <InlineText
              k="servicesTitle"
              value={content.servicesTitle}
              editable={editable}
              label="Hizmetler başlık"
              as="h2"
              className="mt-2 block font-display text-4xl"
            />
          </div>
          <Link href="/randevu" className="hidden text-sm font-semibold text-brass hover:underline sm:block">
            {content.heroPrimaryCta} →
          </Link>
        </div>

        <ul className="mt-8 grid gap-x-12 gap-y-1 md:grid-cols-2">
          {services.map((service) => (
            <li key={service.id} className="price-row py-3">
              <span className="font-medium">{service.name}</span>
              <span className="text-xs text-muted">{service.durationMin} dk</span>
              <span className="leader" aria-hidden="true" />
              <span className="font-semibold tabular-nums">{formatMoney(service.price)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="ustalar" className="border-y border-line bg-white/60">
        <div className="shell py-16 md:py-20">
          <div>
            <InlineText
              k="barbersKicker"
              value={content.barbersKicker}
              editable={editable}
              label="Ustalar üst başlık"
              as="p"
              className="kicker block"
            />
            <InlineText
              k="barbersTitle"
              value={content.barbersTitle}
              editable={editable}
              label="Ustalar başlık"
              as="h2"
              className="mt-2 block font-display text-4xl"
            />
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((barber) => (
              <article key={barber.id} className="card flex flex-col gap-3 p-5">
                <div className="flex items-center gap-3">
                  {barber.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={barber.photo}
                      alt={barber.name}
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-full bg-ink font-display text-2xl text-brass-light">
                      {barber.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <h3 className="font-display text-xl leading-tight">{barber.name}</h3>
                    <p className="text-xs uppercase tracking-wide text-brass">
                      {barber.title ?? "Berber"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted">{barber.bio ?? "Klasik ve modern kesim."}</p>
                <Link
                  href="/randevu"
                  className="mt-auto inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-brass"
                >
                  {content.heroPrimaryCta} <ArrowRight size={14} weight="bold" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-16 md:py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", titleKey: "step1Title", textKey: "step1Text" },
            { n: "2", titleKey: "step2Title", textKey: "step2Text" },
            { n: "3", titleKey: "step3Title", textKey: "step3Text" },
          ].map((step) => (
            <div key={step.n} className="card p-5">
              <span className="font-display text-3xl text-brass">{step.n}</span>
              <InlineText
                k={step.titleKey}
                value={content[step.titleKey as keyof typeof content]}
                editable={editable}
                label={`${step.n}. adım başlık`}
                as="h3"
                className="mt-1 block font-display text-xl"
              />
              <InlineText
                k={step.textKey}
                value={content[step.textKey as keyof typeof content]}
                editable={editable}
                label={`${step.n}. adım açıklama`}
                multiline
                as="p"
                className="mt-1 block text-sm text-muted"
              />
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-8 text-cream sm:flex-row sm:items-center">
          <div>
            <InlineText
              k="ctaTitle"
              value={content.ctaTitle}
              editable={editable}
              label="Alt CTA başlık"
              as="h2"
              className="block font-display text-3xl"
            />
            <InlineText
              k="ctaText"
              value={content.ctaText}
              editable={editable}
              label="Alt CTA açıklama"
              as="p"
              className="mt-1 block text-sm text-stone-400"
            />
          </div>
          <Link href="/randevu" className="btn btn-brass">
            <Scissors size={16} weight="bold" aria-hidden="true" />
            {content.ctaButton}
          </Link>
        </div>
      </section>

      {gallery.length > 0 && (
        <section id="galeri" className="w-full border-y border-stone-800 bg-ink py-4">
          <div className="flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {gallery.map((image, index) => (
              <figure key={image.id} className="shrink-0 snap-start overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt || `Salondan kare ${index + 1}`}
                  loading="lazy"
                  className="h-40 w-56 object-cover sm:h-52 sm:w-72"
                />
              </figure>
            ))}
          </div>
        </section>
      )}

      <SiteFooter settings={content} hours={hours} editable={editable} />

      {editable && !embedded && <EditBar />}
    </div>
  );
}

async function findEarliest(
  barbers: { id: string; name: string }[],
  date: string,
  serviceId: string,
): Promise<{ startMin: number; barberName: string } | null> {
  const results = await Promise.all(
    barbers.map(async (barber) => {
      const slots = await availableSlots(barber.id, date, serviceId);
      return slots.length ? { startMin: slots[0], barberName: barber.name } : null;
    }),
  );
  const valid = results.filter((r): r is { startMin: number; barberName: string } => r !== null);
  if (valid.length === 0) return null;
  return valid.sort((a, b) => a.startMin - b.startMin)[0];
}
