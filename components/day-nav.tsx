import Link from "next/link";
import { CaretLeft, CaretRight } from "@/components/icons";
import { addDays, formatDateLong, todayKey } from "@/lib/time";

export function DayNav({ date, basePath }: { date: string; basePath: string }) {
  const isToday = date === todayKey();
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`${basePath}?date=${addDays(date, -1)}`}
        className="btn btn-outline btn-sm"
        aria-label="Önceki gün"
      >
        <CaretLeft size={16} weight="bold" aria-hidden="true" />
      </Link>
      <div className="min-w-0">
        <p className="truncate font-display text-xl leading-tight">{formatDateLong(date)}</p>
        {isToday && <p className="text-xs font-semibold uppercase tracking-wide text-brass">Bugün</p>}
      </div>
      <Link
        href={`${basePath}?date=${addDays(date, 1)}`}
        className="btn btn-outline btn-sm"
        aria-label="Sonraki gün"
      >
        <CaretRight size={16} weight="bold" aria-hidden="true" />
      </Link>
      {!isToday && (
        <Link href={basePath} className="btn btn-ghost btn-sm">
          Bugün
        </Link>
      )}
    </div>
  );
}
