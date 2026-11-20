import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getTelegramConfig, TG_KEYS } from "@/lib/telegram";
import { TelegramForm } from "@/components/telegram-form";

export const dynamic = "force-dynamic";

export default async function TelegramPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/panel");

  const [config, secretRow] = await Promise.all([
    getTelegramConfig(),
    db.setting.findUnique({ where: { key: TG_KEYS.webhookSecret } }),
  ]);

  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="kicker">Entegrasyon</p>
        <h1 className="font-display text-3xl">Telegram</h1>
        <p className="mt-1 text-sm text-muted">
          Yeni randevular, onay/red butonları ve her akşam 21:00 günlük özet.
        </p>
      </div>

      <TelegramForm
        enabled={config.enabled}
        hasToken={Boolean(config.token)}
        ownerChatId={config.ownerChatId}
        botUsername={config.botUsername}
        webhookSecretSet={Boolean(secretRow?.value)}
        webhookUrl={`https://sedatakgul.online/api/telegram/webhook`}
        appUrl={appUrl}
      />

      <div className="card p-5 text-sm text-muted">
        <h2 className="font-display text-lg text-ink">Kurulum sırası</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Telegram&apos;da <b>@BotFather</b> → <code>/newbot</code> → token al.</li>
          <li>Token&apos;ı yukarıya kaydet, &quot;Bağlantıyı test et&quot;.</li>
          <li>Botu açıp <code>/start</code> yaz; sana gelen chat ID&apos;yi sahip alanına kaydet.</li>
          <li>&quot;Webhook&apos;u kur&quot; — bot komutları ve butonlar ancak bundan sonra çalışır.</li>
          <li>&quot;Sahibe test mesajı&quot; ile doğrula. Özet her akşam 21:00 (İstanbul) gider.</li>
          <li>Botla sohbette <code>/randevularim</code> yazarak günün listesini al.</li>
        </ol>
      </div>
    </div>
  );
}
