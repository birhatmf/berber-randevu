import Link from "next/link";
import { ArrowLeft, Scissors } from "@/components/icons";

export function EditBar() {
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 print:hidden">
      <div className="flex items-center gap-2 rounded-full border border-stone-700 bg-ink/95 px-3 py-2 text-cream shadow-xl backdrop-blur">
        <span className="flex items-center gap-1.5 px-1 text-xs font-semibold">
          <Scissors size={14} weight="bold" className="text-brass-light" aria-hidden="true" />
          Düzenleme modu
        </span>
        <span className="hidden text-[11px] text-stone-400 sm:inline">
          Bir metne veya fotoğrafa tıkla
        </span>
        <Link href="/" className="btn btn-sm border border-stone-600 text-cream hover:bg-stone-800">
          Önizleme
        </Link>
        <Link href="/panel/site" className="btn btn-sm bg-cream text-ink hover:bg-white">
          <ArrowLeft size={14} weight="bold" aria-hidden="true" />
          Panel
        </Link>
      </div>
    </div>
  );
}
