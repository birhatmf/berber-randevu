import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "@/app/actions/auth";
import { PanelNav } from "@/components/panel-nav";
import {
  CalendarDots,
  Gear,
  Images,
  List,
  Scissors,
  SignOut,
  Storefront,
  Users,
  WhatsappLogo,
} from "@/components/icons";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  const settings = await getSettings();

  const items = [
    { href: "/panel", label: "Bugün", icon: <List size={18} weight="bold" /> },
    { href: "/panel/takvim", label: "Takvim", icon: <CalendarDots size={18} weight="bold" /> },
    ...(user.role === "admin"
      ? [
          { href: "/panel/site", label: "Site", icon: <Storefront size={18} weight="bold" /> },
          { href: "/panel/galeri", label: "Galeri", icon: <Images size={18} weight="bold" /> },
          { href: "/panel/whatsapp", label: "WhatsApp", icon: <WhatsappLogo size={18} weight="bold" /> },
          { href: "/panel/berberler", label: "Berberler", icon: <Users size={18} weight="bold" /> },
          { href: "/panel/hizmetler", label: "Hizmetler", icon: <Scissors size={18} weight="bold" /> },
          { href: "/panel/ayarlar", label: "Ayarlar", icon: <Gear size={18} weight="bold" /> },
        ]
      : []),
  ];

  return (
    <div className="min-h-dvh bg-[#f4f2ef]">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/panel" className="flex items-center gap-2">
            <Scissors size={20} weight="bold" className="text-brass" aria-hidden="true" />
            <span className="font-semibold">{settings.shopName || "Panel"}</span>
          </Link>
          <form action={logoutAction}>
            <button className="btn btn-ghost btn-sm" aria-label="Çıkış yap">
              <SignOut size={18} aria-hidden="true" />
            </button>
          </form>
        </div>
        <div className="px-2 pb-2">
          <PanelNav items={items} />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1320px] gap-6 px-0 md:px-6">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 md:flex">
          <Link href="/" className="mb-8 flex items-center gap-2 px-2">
            <Scissors size={22} weight="bold" className="text-brass" aria-hidden="true" />
            <span className="font-semibold leading-tight">{settings.shopName || "Panel"}</span>
          </Link>

          <PanelNav items={items} />

          <div className="mt-auto space-y-3 border-t border-line pt-4">
            <div className="px-2">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs uppercase tracking-wide text-muted">
                {user.role === "admin" ? "Yönetici" : "Berber"}
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              <Storefront size={18} weight="bold" aria-hidden="true" />
              Siteyi gör
            </Link>
            <form action={logoutAction}>
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-stone-100">
                <SignOut size={18} weight="bold" aria-hidden="true" />
                Çıkış yap
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-2 md:py-8">{children}</main>
      </div>
    </div>
  );
}
