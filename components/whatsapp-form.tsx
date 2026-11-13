"use client";

import { useActionState } from "react";
import {
  clearWhatsAppToken,
  saveWhatsAppSettings,
  sendWhatsAppTest,
  testWhatsAppConnection,
} from "@/app/actions/whatsapp";
import type { ActionState } from "@/app/actions/types";
import { CheckCircle, Warning, WhatsappLogo } from "@/components/icons";

type Props = {
  enabled: boolean;
  apiVersion: string;
  phoneNumberId: string;
  businessId: string;
  verifyToken: string;
  hasToken: boolean;
  templates: { otp: string; confirm: string; reminder: string };
  webhookUrl: string;
};

export function WhatsAppForm(props: Props) {
  const [saveState, saveAction, saving] = useActionState<ActionState, FormData>(
    saveWhatsAppSettings,
    {},
  );
  const [testState, testAction, testing] = useActionState<ActionState, FormData>(
    testWhatsAppConnection,
    {},
  );
  const [sendState, sendAction, sending] = useActionState<ActionState, FormData>(
    sendWhatsAppTest,
    {},
  );

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-xl">
              <WhatsappLogo size={20} weight="bold" className="text-[#25D366]" aria-hidden="true" />
              Bağlantı durumu
            </h2>
            <p className="mt-1 text-sm text-muted">
              Kayıtlı ayarlarla Meta Graph API&apos;ye gerçek bir istek atılır; token ve telefon numarası
              ID doğrulanır.
            </p>
          </div>
          <span
            className={`badge ${
              props.enabled && props.hasToken ? "badge-done" : "badge-cancelled"
            }`}
          >
            {props.enabled && props.hasToken ? "Yapılandırıldı" : "Kurulmadı"}
          </span>
        </div>

        <form action={testAction} className="mt-4">
          <button type="submit" className="btn btn-primary btn-sm" disabled={testing}>
            {testing ? "Test ediliyor…" : "Bağlantıyı test et"}
          </button>
        </form>

        {testState.error && <Result tone="error" state={testState} />}
        {testState.ok && <Result tone="ok" state={testState} />}
      </section>

      <form action={saveAction} className="card space-y-4 p-5">
        <h2 className="font-display text-xl">API bilgileri</h2>
        <p className="-mt-2 text-sm text-muted">
          Meta → Uygulamalar → WhatsApp → API Setup ekranındaki değerler. Anahtar veritabanında
          saklanır ve arayüzde bir daha gösterilmez.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="wa-version">
              Graph API sürümü
            </label>
            <input
              id="wa-version"
              name="apiVersion"
              className="field"
              defaultValue={props.apiVersion}
              placeholder="v26.0"
            />
          </div>
          <div>
            <label className="label" htmlFor="wa-phone-id">
              Telefon numarası ID
            </label>
            <input
              id="wa-phone-id"
              name="phoneNumberId"
              className="field"
              defaultValue={props.phoneNumberId}
              placeholder="123456789012345"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="label" htmlFor="wa-business-id">
              WhatsApp Business Account ID <span className="font-normal text-muted">(opsiyonel)</span>
            </label>
            <input
              id="wa-business-id"
              name="businessId"
              className="field"
              defaultValue={props.businessId}
              placeholder="987654321098765"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="label" htmlFor="wa-verify">
              Webhook doğrulama anahtarı
            </label>
            <input
              id="wa-verify"
              name="verifyToken"
              className="field"
              defaultValue={props.verifyToken}
              placeholder="kendi-belirlediginiz-anahtar"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="wa-token">
              Erişim anahtarı (Access Token)
            </label>
            <input
              id="wa-token"
              name="token"
              type="password"
              className="field"
              autoComplete="off"
              placeholder={props.hasToken ? "•••••••• kayıtlı — değiştirmek için yazın" : "EAAG..."}
            />
            <p className="mt-1 text-xs text-muted">
              Sistem kullanıcısı anahtarı kalıcıdır; 24 saatlik test anahtarı süresi dolunca bağlantı
              testi hata verir.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-stone-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Webhook adresi
          </p>
          <code className="mt-1 block break-all text-sm">{props.webhookUrl}</code>
          <p className="mt-1 text-xs text-muted">
            Meta panelinde Callback URL olarak bunu, Verify Token olarak yukarıdaki anahtarı girin.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="wa-tpl-otp">
              OTP şablonu
            </label>
            <input
              id="wa-tpl-otp"
              name="templateOtp"
              className="field"
              defaultValue={props.templates.otp}
            />
          </div>
          <div>
            <label className="label" htmlFor="wa-tpl-confirm">
              Onay şablonu
            </label>
            <input
              id="wa-tpl-confirm"
              name="templateConfirm"
              className="field"
              defaultValue={props.templates.confirm}
            />
          </div>
          <div>
            <label className="label" htmlFor="wa-tpl-reminder">
              Hatırlatma şablonu
            </label>
            <input
              id="wa-tpl-reminder"
              name="templateReminder"
              className="field"
              defaultValue={props.templates.reminder}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={props.enabled}
            className="size-4 accent-[#a16207]"
          />
          WhatsApp mesajları aktif (kapalıyken mesajlar sadece sunucu konsoluna yazılır)
        </label>

        {saveState.error && (
          <p role="alert" className="text-sm text-danger">
            {saveState.error}
          </p>
        )}
        {saveState.ok && <p className="text-sm text-emerald-700">{saveState.message}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </form>

      {props.hasToken && (
        <form action={clearWhatsAppToken} className="card p-5">
          <h2 className="font-display text-lg">Anahtarı kaldır</h2>
          <p className="mt-1 text-sm text-muted">
            Kayıtlı erişim anahtarını siler ve WhatsApp mesajlarını kapatır.
          </p>
          <button type="submit" className="btn btn-danger btn-sm mt-3">
            Anahtarı sil
          </button>
        </form>
      )}

      <form action={sendAction} className="card space-y-3 p-5">
        <h2 className="font-display text-xl">Test mesajı gönder</h2>
        <p className="-mt-1 text-sm text-muted">
          Gerçek bir şablon mesajı gönderir. Şablon Meta&apos;da onaylı olmalı ve alıcı numarası test
          listesinde bulunmalı (geliştirme modunda).
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="wa-to">
              Alıcı telefon
            </label>
            <input
              id="wa-to"
              name="to"
              className="field"
              inputMode="tel"
              placeholder="0532 123 45 67"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="wa-template">
              Şablon
            </label>
            <select id="wa-template" name="template" className="field">
              <option value={props.templates.confirm}>{props.templates.confirm} (onay)</option>
              <option value={props.templates.otp}>{props.templates.otp} (kod)</option>
              <option value={props.templates.reminder}>
                {props.templates.reminder} (hatırlatma)
              </option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="wa-params">
              Şablon değişkenleri <span className="font-normal text-muted">(opsiyonel)</span>
            </label>
            <input
              id="wa-params"
              name="params"
              className="field"
              placeholder="Ahmet Yıldız | 4 Kasım 10:30"
            />
            <p className="mt-1 text-xs text-muted">
              Sırayla `|` ile ayırın. Onay şablonu: berber | tarih. OTP: kod.
            </p>
          </div>
        </div>

        {sendState.error && <Result tone="error" state={sendState} />}
        {sendState.ok && <Result tone="ok" state={sendState} />}

        <button type="submit" className="btn btn-brass" disabled={sending}>
          {sending ? "Gönderiliyor…" : "Test mesajı gönder"}
        </button>
      </form>
    </div>
  );
}

function Result({ tone, state }: { tone: "ok" | "error"; state: ActionState }) {
  const ok = tone === "ok";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={`mt-3 rounded-lg px-3 py-2 text-sm ${
        ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"
      }`}
    >
      <p className="flex items-center gap-1.5 font-medium">
        {ok ? (
          <CheckCircle size={15} weight="bold" aria-hidden="true" />
        ) : (
          <Warning size={15} weight="bold" aria-hidden="true" />
        )}
        {state.error ?? state.message}
      </p>
      {state.details && <p className="mt-1 break-words text-xs opacity-80">{state.details}</p>}
    </div>
  );
}
