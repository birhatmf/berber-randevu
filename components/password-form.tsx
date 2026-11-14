"use client";

import { useActionState, useEffect, useRef } from "react";
import { changeOwnPassword } from "@/app/actions/panel";
import type { ActionState } from "@/app/actions/types";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    changeOwnPassword,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="card max-w-md space-y-3 p-4">
      <h2 className="font-display text-xl">Şifre değiştir</h2>

      <div>
        <label className="label" htmlFor="p-current">
          Mevcut şifre
        </label>
        <input
          id="p-current"
          name="current"
          type="password"
          className="field"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="p-next">
          Yeni şifre
        </label>
        <input
          id="p-next"
          name="next"
          type="password"
          className="field"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="p-confirm">
          Yeni şifre (tekrar)
        </label>
        <input
          id="p-confirm"
          name="confirm"
          type="password"
          className="field"
          autoComplete="new-password"
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && <p className="text-sm text-emerald-700">{state.message}</p>}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Şifreyi güncelle"}
      </button>
    </form>
  );
}
