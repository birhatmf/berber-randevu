import Link from "next/link";
import { formatMin } from "@/lib/time";
import type { Settings } from "@/lib/settings";
import { InstagramLogo, MapPin, Scissors, WhatsappLogo } from "@/components/icons";
import { whatsappLink } from "@/lib/phone";
import { InlineText } from "@/components/inline-text";

export type HourLine = { label: string; value: string };

export function SiteFooter({
  settings,
  hours,
  editable = false,
}: {
  settings: Settings;
  hours: HourLine[];
  editable?: boolean;
}) {
  const dialable = settings.phone.replace(/[^\d+]/g, "");
  return (
    <footer id="iletisim" className="mt-20 bg-ink text-cream">
      <div className="shell grid gap-10 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <Scissors size={20} weight="bold" className="text-brass-light" aria-hidden="true" />
            <InlineText
              k="shopName"
              value={settings.shopName}
              editable={editable}
              label="Firma adı"
              className="font-display text-2xl"
            />
          </div>
          <InlineText
            k="tagline"
            value={settings.tagline}
            editable={editable}
            label="Slogan"
            as="p"
            className="mt-3 block max-w-xs text-sm text-stone-400"
          />
          <div className="mt-5 flex gap-2">
            {dialable && (
              <a
                href={`tel:${dialable}`}
                className="btn btn-sm border border-stone-700 text-cream hover:bg-stone-800"
              >
                Ara
              </a>
            )}
            {dialable && (
              <a
                href={whatsappLink(dialable)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm border border-stone-700 text-cream hover:bg-stone-800"
              >
                <WhatsappLogo size={16} weight="bold" aria-hidden="true" />
                WhatsApp
              </a>
            )}
            {settings.instagram && (
              <a
                href={`https://instagram.com/${settings.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm border border-stone-700 text-cream hover:bg-stone-800"
              >
                <InstagramLogo size={16} weight="bold" aria-hidden="true" />
                Instagram
              </a>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-brass-light">
            Adres
          </h3>
          <p className="mt-3 flex items-start gap-2 text-sm text-stone-300">
            <MapPin size={16} weight="bold" className="mt-0.5 shrink-0" aria-hidden="true" />
            <InlineText
              k="address"
              value={settings.address}
              editable={editable}
              label="Adres"
              className="inline"
            />
          </p>
          {settings.mapsUrl && (
            <a
              href={settings.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm text-brass-light underline-offset-4 hover:underline"
            >
              Haritada aç
            </a>
          )}
          <InlineText
            k="phone"
            value={settings.phone}
            editable={editable}
            label="Telefon"
            as="p"
            className="mt-4 block text-sm text-stone-400"
          />
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-brass-light">
            Çalışma saatleri
          </h3>
          <ul className="mt-3 space-y-1 text-sm">
            {hours.map((h) => (
              <li key={h.label} className="flex justify-between gap-4 border-b border-stone-800 py-1">
                <span className="text-stone-400">{h.label}</span>
                <span className="tabular-nums">{h.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-800">
        <div className="shell flex flex-col gap-2 py-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {settings.shopName}. Tüm hakları saklıdır.</p>
          <div className="flex gap-4">
            <Link href="/randevum" className="hover:text-stone-300">
              Randevu sorgula
            </Link>
            <Link href="/login" className="hover:text-stone-300">
              Panel girişi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function shopHoursLines(
  segments: { weekday: number; startMin: number; endMin: number }[],
): HourLine[] {
  const names = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((weekday) => {
    const day = segments.filter((s) => s.weekday === weekday).sort((a, b) => a.startMin - b.startMin);
    return {
      label: names[weekday],
      value: day.length
        ? day.map((s) => `${formatMin(s.startMin)}–${formatMin(s.endMin)}`).join(" / ")
        : "Kapalı",
    };
  });
}
