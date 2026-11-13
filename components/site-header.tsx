"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SiteHeader({
  shopName,
  variant = "solid",
}: {
  shopName: string;
  variant?: "solid" | "overlay";
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (variant !== "overlay") return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [variant]);

  const overlay = variant === "overlay";
  const floating = overlay && !scrolled;

  const shell = floating
    ? "bg-transparent text-cream"
    : overlay
      ? "border-b border-white/10 bg-ink/95 text-cream backdrop-blur-md"
      : "border-b border-line bg-cream/90 text-ink backdrop-blur";

  const linkClass = floating
    ? "text-cream/80 hover:text-cream"
    : overlay
      ? "text-stone-300 hover:text-cream"
      : "text-stone-600 hover:text-ink";

  const showName = !floating;
  return (
    <header
      className={`${overlay ? "fixed" : "sticky"} inset-x-0 top-0 z-50 transition-colors duration-300 ${shell}`}
    >
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className={`font-hero text-lg uppercase tracking-[0.12em] transition-opacity ${
            shopName ? "" : "invisible"
          } ${showName ? "opacity-100" : "opacity-100 md:pointer-events-none md:opacity-0"}`}
        >
          {shopName || "Ana sayfa"}
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex" aria-label="Ana menü">
          <Link href="/#hizmetler" className={`transition-colors ${linkClass}`}>
            Hizmetler
          </Link>
          <Link href="/#ustalar" className={`transition-colors ${linkClass}`}>
            Ustalar
          </Link>
          <Link href="/#galeri" className={`transition-colors ${linkClass}`}>
            Galeri
          </Link>
          <Link href="/#iletisim" className={`transition-colors ${linkClass}`}>
            İletişim
          </Link>
          <Link href="/randevum" className={`transition-colors ${linkClass}`}>
            Randevum
          </Link>
        </nav>

        <Link
          href="/randevu"
          className={`btn btn-sm ${floating || overlay ? "btn-brass" : "btn-primary"}`}
        >
          Randevu al
        </Link>
      </div>
    </header>
  );
}
