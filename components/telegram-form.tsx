"use client";

import { useActionState } from "react";
import {
  clearTelegramToken,
  saveTelegramSettings,
  sendSummaryNow,
  sendTelegramTest,
  setupTelegramWebhook,
  testTelegramConnection,
} from "@/app/actions/telegram";
import type { ActionState } from "@/app/actions/types";

type Props = {
  enabled: boolean;
  hasToken: boolean;
  ownerChatId: string;
  botUsername: string;
  webhookSecretSet: boolean;
  webhookUrl: string;
  appUrl: string;
};

function Result({ tone, state }: { tone: "ok" | "error"; state: ActionState }) {
  const message = tone === "ok" ? state.message : state.error;
  if (!message) return null;
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-lg px-3 py-2 text-sm ${
        tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-danger"
      }`}
    >
      {message}
      {state.details && <span className="mt-1 block text-xs opacity-80">{state.details}</span>}
    </p>
  );
}

export function TelegramForm(props: Props) {
  const [saveState, saveAction, saving] = useActionState<ActionState, FormData>(
    saveTelegramSettings,
    {},
  );
  const [testState, testAction, testing] = useActionState<ActionState, FormData>(
    async () => testTelegramConnection(),
    {},
  );
  const [sendState, sendAction, sending] = useActionState<ActionState, FormData>(
    async () => sendTelegramTest(),
    {},
  );
  const [hookState, hookAction, hooking] = useActionState<ActionState, FormData>(
    async () => setupTelegramWebhook(props.appUrl),
    {},
  );
  const [summaryState, summaryAction, summarizing] = useActionState<ActionState, FormData>(
    async () => sendSummaryNow(),
    {},
  );

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl">Bağlantı durumu</h2>
            <p className="mt-1 text-sm text-muted">
              Bot token&apos;ı doğrulanır; webhook kurulduktan sonra onay/red butonları çalışır.
            </p>
          </div>
          <span className={`badge ${props.enabled && props.hasToken ? "badge-done" : "badge-cancelled"}`}>
            {props.enabled && props.hasToken ? "Yapılandırıldı" : "Kurulmadı"}
          </span>
        </div>

        {props.botUsername && (
          <p className="mt-2 text-sm text-muted">
            Bot:{" "}
            <a
              href={`https://t.me/${props.botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ink underline"
            >
              @{props.botUsername}
            </a>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <form action={testAction}>
            <button className="btn btn-primary btn-sm" disabled={testing}>
              {testing ? "Test ediliyor…" : "Bağlantıyı test et"}
            </button>
          </form>
          <form action={hookAction}>
            <button className="btn btn-outline btn-sm" disabled={hooking}>
              {hooking ? "Kuruluyor…" : "Webhook'u kur"}
            </button>
          </form>
          <form action={sendAction}>
            <button className="btn btn-outline btn-sm" disabled={sending}>
              {sending ? "Gönderiliyor…" : "Sahibe test mesajı"}
            </button>
          </form>
          <form action={summaryAction}>
            <button className="btn btn-ghost btn-sm" disabled={summarizing}>
              {summarizing ? "Hazırlanıyor…" : "Günlük özeti şimdi gönder"}
            </button>
          </form>
        </div>

        {testState.error && <div className="mt-3"><Result tone="error" state={testState} /></div>}
        {testState.ok && <div className="mt-3"><Result tone="ok" state={testState} /></div>}
        {hookState.error && <div className="mt-3"><Result tone="error" state={hookState} /></div>}
        {hookState.ok && <div className="mt-3"><Result tone="ok" state={hookState} /></div>}
        {sendState.error && <div className="mt-3"><Result tone="error" state={sendState} /></div>}
        {sendState.ok && <div className="mt-3"><Result tone="ok" state={sendState} /></div>}
        {summaryState.error && <div className="mt-3"><Result tone="error" state={summaryState} /></div>}
        {summaryState.ok && <div className="mt-3"><Result tone="ok" state={summaryState} /></div>}

        <p className="mt-3 text-xs text-muted">
          Webhook adresi: <code className="break-all">{props.webhookUrl}</code>
          {props.webhookSecretSet ? " · secret tanımlı" : " · secret henüz yok"}
        </p>
      </section>

      <form action={saveAction} className="card space-y-4 p-5">
        <h2 className="font-display text-xl">Bot bilgileri</h2>
        <p className="-mt-2 text-sm text-muted">
          Telegram&apos;da <b>@BotFather</b> → <code>/newbot</code> ile bot oluşturup verdiği token&apos;ı
          buraya yazın. Token veritabanında saklanır, arayüzde bir daha gösterilmez.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tg-token">
              Bot token {props.hasToken && <span className="font-normal text-muted">(kayıtlı)</span>}
            </label>
            <input
              id="tg-token"
              name="token"
              className="field"
              placeholder={props.hasToken ? "••••••••  (değiştirmek için yazın)" : "123456789:AAH…"}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label" htmlFor="tg-bot">
              Bot kullanıcı adı <span className="font-normal text-muted">(opsiyonel)</span>
            </label>
            <input
              id="tg-bot"
              name="botUsername"
              className="field"
              defaultValue={props.botUsername}
              placeholder="berber_randevu_bot"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="tg-owner">
              Sahip chat ID
            </label>
            <input
              id="tg-owner"
              name="ownerChatId"
              className="field"
              defaultValue={props.ownerChatId}
              placeholder="123456789  (gruplarda -100…)"
              inputMode="numeric"
            />
            <p className="mt-1 text-xs text-muted">
              Botu açıp <code>/start</code> yazın; bot size chat ID&apos;nizi söyler.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={props.enabled} className="size-4" />
          Telegram bildirimleri aktif
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>

        {saveState.error && <Result tone="error" state={saveState} />}
        {saveState.ok && <Result tone="ok" state={saveState} />}
      </form>

      <form action={clearTelegramToken}>
        <button className="btn btn-ghost btn-sm text-danger">Bot token&apos;ını sil</button>
      </form>

      <section className="card p-5">
        <h2 className="font-display text-xl">Bot komutları</h2>
        <p className="mt-1 text-sm text-muted">
          Bot yalnızca sahibe (yukarıdaki chat ID) açıktır; başka sohbetlere yanıt vermez. Bu komutları
          botla olan sohbette yazın:
        </p>
        <ul className="mt-3 divide-y divide-line text-sm">
          <li className="flex flex-wrap items-baseline gap-2 py-2">
            <code className="rounded bg-stone-100 px-1.5 py-0.5">/randevularim</code>
            <span className="text-muted">bugünün randevuları</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2 py-2">
            <code className="rounded bg-stone-100 px-1.5 py-0.5">/randevularim yarin</code>
            <span className="text-muted">yarının randevuları</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2 py-2">
            <code className="rounded bg-stone-100 px-1.5 py-0.5">/randevularim 2026-11-25</code>
            <span className="text-muted">belirli bir gün</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2 py-2">
            <code className="rounded bg-stone-100 px-1.5 py-0.5">/ozet</code>
            <span className="text-muted">günlük özeti hemen gönder</span>
          </li>
          <li className="flex flex-wrap items-baseline gap-2 py-2">
            <code className="rounded bg-stone-100 px-1.5 py-0.5">/yardim</code>
            <span className="text-muted">komut listesi</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
