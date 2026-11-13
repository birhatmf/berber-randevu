import { setAppointmentStatus, deleteAppointment } from "@/app/actions/panel";
import { formatPhone } from "@/lib/phone";
import { timeOf } from "@/lib/time";
import { CalendarDots, CheckCircle, Clock, Warning } from "@/components/icons";

export type AppointmentItemData = {
  id: string;
  start: string;
  end: string;
  customerName: string;
  customerPhone: string;
  status: string;
  type: string;
  source: string;
  note: string | null;
  serviceName: string | null;
  barberName: string;
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Onaylı",
  done: "Geldi",
  no_show: "Gelmedi",
  cancelled: "İptal",
};

function StatusPill({ status, type }: { status: string; type: string }) {
  if (type === "block") {
    return <span className="badge badge-block">Bloke</span>;
  }
  return <span className={`badge badge-${status}`}>{STATUS_LABEL[status] ?? status}</span>;
}

export function AppointmentItem({
  item,
  showBarber = false,
}: {
  item: AppointmentItemData;
  showBarber?: boolean;
}) {
  const isBlock = item.type === "block";
  const isPast = new Date(item.end) < new Date();

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4 ${
        item.status === "cancelled"
          ? "border-line bg-stone-50 opacity-60"
          : item.status === "done"
            ? "border-emerald-200 bg-emerald-50/40"
            : item.status === "no_show"
              ? "border-red-200 bg-red-50/40"
              : "border-line bg-white"
      }`}
    >
      <div className="flex w-full items-center gap-3 sm:w-auto">
        <div className="w-14 shrink-0 text-sm font-semibold tabular-nums">
          {timeOf(new Date(item.start))}
        </div>
        <StatusPill status={item.status} type={item.type} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {isBlock ? (item.note || "Mola") : item.customerName || "İsimsiz"}
          {item.source === "walkin" && (
            <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-brass">
              Walk-in
            </span>
          )}
        </p>
        <p className="truncate text-sm text-muted">
          {item.serviceName ?? "—"}
          {showBarber && ` · ${item.barberName}`}
          {!isBlock && item.customerPhone && ` · ${formatPhone(item.customerPhone)}`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {!isBlock && item.status === "confirmed" && (
          <>
            <form action={setAppointmentStatus}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="status" value="done" />
              <button className="btn btn-sm btn-outline" title="Geldi olarak işaretle">
                <CheckCircle size={15} weight="bold" aria-hidden="true" />
                Geldi
              </button>
            </form>
            <form action={setAppointmentStatus}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="status" value="no_show" />
              <button className="btn btn-sm btn-ghost" title="Gelmedi olarak işaretle">
                <Warning size={15} weight="bold" aria-hidden="true" />
                Gelmedi
              </button>
            </form>
            {isPast && (
              <form action={setAppointmentStatus}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value="cancelled" />
                <button className="btn btn-sm btn-ghost">İptal</button>
              </form>
            )}
          </>
        )}

        {(item.status === "done" || item.status === "no_show") && (
          <form action={setAppointmentStatus}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value="confirmed" />
            <button className="btn btn-sm btn-ghost">Geri al</button>
          </form>
        )}

        {item.status === "cancelled" && (
          <form action={setAppointmentStatus}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="status" value="confirmed" />
            <button className="btn btn-sm btn-ghost">Geri al</button>
          </form>
        )}

        {(isBlock || item.status === "cancelled") && (
          <form action={deleteAppointment}>
            <input type="hidden" name="id" value={item.id} />
            <button className="btn btn-sm btn-ghost" title="Sil">
              Sil
            </button>
          </form>
        )}
      </div>
    </li>
  );
}

export function EmptyDay() {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <CalendarDots size={32} weight="duotone" className="text-stone-300" aria-hidden="true" />
      <p className="font-medium">Bu gün için randevu yok</p>
      <p className="flex items-center gap-1 text-sm text-muted">
        <Clock size={14} aria-hidden="true" /> Walk-in eklemek için yukarıdaki butonu kullanın.
      </p>
    </div>
  );
}
