"use client";

import { useActionState } from "react";
import { saveService } from "@/app/actions/panel";
import type { ActionState } from "@/app/actions/types";

type Service = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  sortOrder: number;
};

export function ServiceForm({ service }: { service?: Service }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveService, {});

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <h2 className="font-display text-xl">{service ? "Hizmeti düzenle" : "Yeni hizmet"}</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="s-name">
            Hizmet adı
          </label>
          <input id="s-name" name="name" className="field" defaultValue={service?.name} required />
        </div>
        <div>
          <label className="label" htmlFor="s-dur">
            Süre (dakika)
          </label>
          <input
            id="s-dur"
            name="durationMin"
            type="number"
            min={5}
            max={480}
            step={5}
            className="field"
            defaultValue={service?.durationMin ?? 30}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="s-price">
            Fiyat (₺)
          </label>
          <input
            id="s-price"
            name="priceTl"
            type="number"
            min={0}
            step={10}
            className="field"
            defaultValue={service ? service.price / 100 : 300}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="s-order">
            Sıra
          </label>
          <input
            id="s-order"
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            className="field"
            defaultValue={service?.sortOrder ?? 0}
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </button>
    </form>
  );
}
