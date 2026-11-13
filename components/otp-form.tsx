"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/app/actions/public";
import type { ActionState } from "@/app/actions/types";
import { ArrowRight, WhatsappLogo } from "@/components/icons";

export function OtpForm() {
  const router = useRouter();
  const [requestState, requestAction, requesting] = useActionState<ActionState, FormData>(
    requestOtp,
    {},
  );
  const [verifyState, verifyAction, verifying] = useActionState<ActionState, FormData>(
    async (prev: ActionState, formData: FormData) => {
      const result = await verifyOtp(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    {},
  );
  const codeRef = useRef<HTMLInputElement>(null);

  if (!requestState.ok) {
    return (
      <form action={requestAction} className="card space-y-3 p-5">
        <p className="text-sm text-muted">
          Randevunuzu görmek için telefonunuza kod göndereceğiz.
        </p>
        <div>
          <label className="label" htmlFor="q-name">
            Ad soyad
          </label>
          <input
            id="q-name"
            name="name"
            className="field"
            autoComplete="name"
            placeholder="Ad Soyad"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="q-phone">
            Telefon
          </label>
          <input
            id="q-phone"
            name="phone"
            className="field"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0532 123 45 67"
            required
          />
        </div>

        {requestState.error && (
          <p role="alert" className="text-sm text-danger">
            {requestState.error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={requesting}>
          {requesting ? "Gönderiliyor…" : "Kod gönder"}
          {!requesting && <ArrowRight size={16} weight="bold" aria-hidden="true" />}
        </button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="card space-y-3 p-5">
      <p role="status" className="flex items-center gap-2 text-sm text-emerald-700">
        <WhatsappLogo size={16} weight="bold" aria-hidden="true" />
        Kod WhatsApp&apos;tan gönderildi.
      </p>

      {requestState.devCode && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          WhatsApp ayarlı değil (geliştirme modu). Kod: <strong>{requestState.devCode}</strong>
        </p>
      )}

      <div>
        <label className="label" htmlFor="q-code">
          6 haneli kod
        </label>
        <input
          ref={codeRef}
          id="q-code"
          name="code"
          className="field text-center text-xl tracking-[0.4em] tabular-nums"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          required
        />
      </div>

      {verifyState.error && (
        <p role="alert" className="text-sm text-danger">
          {verifyState.error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={verifying}>
        {verifying ? "Doğrulanıyor…" : "Doğrula"}
      </button>
      <p className="text-xs text-muted">
        Kod gelmediyse 2 dakika bekleyip tekrar deneyin veya dükkânı arayın.
      </p>
    </form>
  );
}
