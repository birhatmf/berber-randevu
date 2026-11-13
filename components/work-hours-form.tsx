"use client";

import { useActionState } from "react";
import { saveShopWorkHours, saveWorkHours } from "@/app/actions/panel";
import type { ActionState } from "@/app/actions/types";
import { WEEKDAYS } from "@/lib/time";
import type { DayHours } from "@/lib/workhours";

export function WorkHoursForm({
  barberId,
  days,
  scope = "barber",
}: {
  barberId?: string;
  days: DayHours[];
  scope?: "barber" | "shop";
}) {
  const action = scope === "shop" ? saveShopWorkHours : saveWorkHours;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="card space-y-3 p-4">
      {scope === "barber" && <input type="hidden" name="barberId" value={barberId ?? ""} />}

      <h2 className="font-display text-xl">
        {scope === "shop" ? "Dükkân çalışma saatleri" : "Çalışma saatleri"}
      </h2>
      <p className="-mt-1 text-sm text-muted">
        {scope === "shop"
          ? "Kaydedince tüm aktif berberlerin saatleri bu şablonla değişir. Kişiye özel saatler için Berberler sayfasını kullanın."
          : "Mola alanı boş bırakılırsa tek parça çalışma olarak kaydedilir."}
      </p>

      <div className="divide-y divide-line">
        {days.map((day) => (
          <div
            key={day.weekday}
            className="grid grid-cols-[auto_1fr] items-center gap-3 py-2 sm:grid-cols-[7rem_repeat(4,1fr)]"
          >
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name={`w-${day.weekday}-on`}
                defaultChecked={day.on}
                className="size-4 accent-[#a16207]"
              />
              {WEEKDAYS[day.weekday]}
            </label>
            <div className="col-span-1 grid grid-cols-2 gap-2 sm:col-span-4 sm:grid-cols-4">
              <label className="text-[11px] text-muted">
                Açılış
                <input
                  type="time"
                  name={`w-${day.weekday}-start`}
                  defaultValue={day.start}
                  className="field mt-0.5"
                />
              </label>
              <label className="text-[11px] text-muted">
                Kapanış
                <input
                  type="time"
                  name={`w-${day.weekday}-end`}
                  defaultValue={day.end}
                  className="field mt-0.5"
                />
              </label>
              <label className="text-[11px] text-muted">
                Mola başlangıç
                <input
                  type="time"
                  name={`w-${day.weekday}-breakStart`}
                  defaultValue={day.breakStart}
                  className="field mt-0.5"
                />
              </label>
              <label className="text-[11px] text-muted">
                Mola bitiş
                <input
                  type="time"
                  name={`w-${day.weekday}-breakEnd`}
                  defaultValue={day.breakEnd}
                  className="field mt-0.5"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Saatleri kaydet"}
      </button>
    </form>
  );
}
