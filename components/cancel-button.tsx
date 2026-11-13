"use client";

import { useActionState } from "react";
import { cancelOwnAppointment } from "@/app/actions/public";
import type { ActionState } from "@/app/actions/types";

export function CancelButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    cancelOwnAppointment,
    {},
  );

  if (state.ok) {
    return <span className="text-xs font-medium text-emerald-700">İptal edildi</span>;
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("Bu randevu iptal edilsin mi?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-sm btn-outline" disabled={pending}>
        {pending ? "İptal ediliyor…" : "İptal et"}
      </button>
      {state.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
