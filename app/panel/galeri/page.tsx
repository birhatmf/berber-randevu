import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { GalleryManager } from "@/components/gallery-manager";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/panel");

  const images = await db.galleryImage.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <p className="kicker">CMS</p>
        <h1 className="font-display text-3xl">Galeri</h1>
        <p className="mt-1 text-sm text-muted">
          Ana sayfanın altındaki fotoğraf şeridi. Sıralamayı oklarla değiştirin;{" "}
          <Link href="/#galeri" className="underline">
            siteyi gör
          </Link>
          .
        </p>
      </div>

      <GalleryManager images={images} />
    </div>
  );
}
