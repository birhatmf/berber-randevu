import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ArrowSquareOut, Gear } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SiteEditorPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/panel");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="kicker">CMS</p>
          <h1 className="font-display text-3xl">Site içeriği</h1>
          <p className="mt-1 text-sm text-muted">
            Önizlemede bir metne veya fotoğrafa tıklayın. Değişiklik anında yayınlanır.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/panel/ayarlar" className="btn btn-outline btn-sm">
            <Gear size={15} weight="bold" aria-hidden="true" />
            Tüm alanlar
          </Link>
          <a
            href="/?edit=1"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
          >
            <ArrowSquareOut size={15} weight="bold" aria-hidden="true" />
            Yeni sekmede
          </a>
        </div>
      </div>

      <div className="card overflow-hidden p-1">
        <iframe
          src="/?edit=1&embed=1"
          title="Site önizleme ve düzenleyici"
          className="h-[calc(100dvh-13rem)] w-full rounded-lg border-0 bg-white"
        />
      </div>

      <p className="text-xs text-muted">
        Hizmetler, berberler ve çalışma saatleri kendi sayfalarından yönetilir:{" "}
        <Link href="/panel/hizmetler" className="underline">
          Hizmetler
        </Link>
        ,{" "}
        <Link href="/panel/berberler" className="underline">
          Berberler
        </Link>
        . Fotoğraf yüklemek için önizlemede fotoğrafın üzerine gelin.
      </p>
    </div>
  );
}
