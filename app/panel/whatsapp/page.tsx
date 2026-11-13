import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getWhatsAppConfig } from "@/lib/whatsapp";
import { WhatsAppForm } from "@/components/whatsapp-form";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/panel");

  const config = await getWhatsAppConfig();
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="kicker">Entegrasyon</p>
        <h1 className="font-display text-3xl">WhatsApp</h1>
        <p className="mt-1 text-sm text-muted">
          Kendi Meta Cloud API bilgilerinizi girin, bağlantıyı test edin ve test mesajı gönderin.
        </p>
      </div>

      <WhatsAppForm
        enabled={config.enabled}
        apiVersion={config.apiVersion}
        phoneNumberId={config.phoneNumberId}
        businessId={config.businessId}
        verifyToken={config.verifyToken}
        hasToken={Boolean(config.token)}
        templates={config.templates}
        webhookUrl={`${appUrl}/api/whatsapp/webhook`}
      />

      <div className="card p-5 text-sm text-muted">
        <h2 className="font-display text-lg text-ink">Kurulum sırası</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Meta for Developers&apos;ta uygulama oluştur, WhatsApp ürününü ekle.</li>
          <li>API Setup ekranından Phone Number ID ve geçici/kalıcı token al.</li>
          <li>
            Sistem kullanıcısı oluşturup <code>whatsapp_business_messaging</code> izinli kalıcı token
            üret (24 saatlik token sürekli düşer).
          </li>
          <li>Şablonları (otp / onay / hatırlatma) Meta&apos;da onaylat ve adlarını buraya yaz.</li>
          <li>Webhook adresini ve doğrulama anahtarını Meta panelinde tanımla.</li>
          <li>Burada “Bağlantıyı test et”, sonra kendi numarana “Test mesajı gönder”.</li>
        </ol>
      </div>
    </div>
  );
}
