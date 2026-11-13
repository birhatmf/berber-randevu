"use client";

import { useActionState } from "react";
import { Plus } from "@/components/icons";
import { addAppointment } from "@/app/actions/panel";
import type { ActionState } from "@/app/actions/types";

type Option = { id: string; name: string };

export function AddAppointment({
  barbers,
  services,
  date,
  defaultBarberId,
  defaultTime,
}: {
  barbers: Option[];
  services: Option[];
  date: string;
  defaultBarberId?: string;
  defaultTime?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addAppointment, {});

  return (
    <details className="group">
      <summary className="btn btn-brass list-none cursor-pointer">
        <Plus size={16} weight="bold" aria-hidden="true" />
        Randevu ekle
      </summary>

      <form
        action={formAction}
        className="card mt-3 space-y-3 p-4"
        aria-label="Yeni randevu veya walk-in ekle"
      >
        <input type="hidden" name="date" value={date} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="add-barber">
              Berber
            </label>
            <select
              id="add-barber"
              name="barberId"
              className="field"
              defaultValue={defaultBarberId ?? barbers[0]?.id}
              required
            >
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="add-service">
              Hizmet
            </label>
            <select id="add-service" name="serviceId" className="field" required>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="add-time">
              Saat
            </label>
            <input
              id="add-time"
              name="time"
              type="time"
              step={900}
              defaultValue={defaultTime ?? "10:00"}
              className="field"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="add-name">
              İsim <span className="font-normal text-muted">(walk-in ise boş)</span>
            </label>
            <input id="add-name" name="name" className="field" placeholder="Ad Soyad" />
          </div>
          <div>
            <label className="label" htmlFor="add-phone">
              Telefon
            </label>
            <input
              id="add-phone"
              name="phone"
              className="field"
              inputMode="tel"
              placeholder="0532 123 45 67"
            />
          </div>
          <div>
            <label className="label" htmlFor="add-note">
              Not
            </label>
            <input id="add-note" name="note" className="field" placeholder="Opsiyonel" />
          </div>
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Ekleniyor…" : "Ekle"}
        </button>
      </form>
    </details>
  );
}
