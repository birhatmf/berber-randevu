import { db } from "./db";

export type SendResult = {
  ok: boolean;
  dryRun?: boolean;
  error?: string;
  details?: string;
};

export type WhatsAppConfig = {
  enabled: boolean;
  apiVersion: string;
  phoneNumberId: string;
  businessId: string;
  token: string;
  verifyToken: string;
  templates: { otp: string; confirm: string; reminder: string };
};

export const WA_KEYS = {
  enabled: "waEnabled",
  apiVersion: "waApiVersion",
  phoneNumberId: "waPhoneNumberId",
  businessId: "waBusinessId",
  token: "waToken",
  verifyToken: "waVerifyToken",
  otp: "waTemplateOtp",
  confirm: "waTemplateConfirm",
  reminder: "waTemplateReminder",
} as const;

export const DEFAULT_API_VERSION = "v26.0";

/**
 * Ayarlar Setting tablosunda tutulur (site içeriğinden ayrı anahtarlar).
 * Boş alanlar .env değerlerine düşer; ikisi de yoksa dry-run modu.
 */
export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const rows = await db.setting.findMany({ where: { key: { in: Object.values(WA_KEYS) } } });
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const pick = (key: string, fallback = "") => (map[key] ?? "").trim() || fallback;

  return {
    enabled: pick(WA_KEYS.enabled, process.env.WHATSAPP_TOKEN ? "1" : "0") === "1",
    apiVersion: pick(WA_KEYS.apiVersion, DEFAULT_API_VERSION),
    phoneNumberId: pick(WA_KEYS.phoneNumberId, process.env.WHATSAPP_PHONE_NUMBER_ID ?? ""),
    businessId: pick(WA_KEYS.businessId),
    token: pick(WA_KEYS.token, process.env.WHATSAPP_TOKEN ?? ""),
    verifyToken: pick(WA_KEYS.verifyToken, process.env.WHATSAPP_VERIFY_TOKEN ?? ""),
    templates: {
      otp: pick(WA_KEYS.otp, process.env.WHATSAPP_OTP_TEMPLATE ?? "otp_kodu"),
      confirm: pick(WA_KEYS.confirm, process.env.WHATSAPP_CONFIRM_TEMPLATE ?? "randevu_onayi"),
      reminder: pick(WA_KEYS.reminder, process.env.WHATSAPP_REMINDER_TEMPLATE ?? "randevu_hatirlatma"),
    },
  };
}

function graphError(status: number, body: unknown) {
  const error = (body as { error?: { message?: string; code?: number; error_subcode?: number } })?.error;
  return {
    ok: false as const,
    error: error?.message ?? `Graph API ${status}`,
    details: error?.code ? `kod ${error.code}${error.error_subcode ? ` / ${error.error_subcode}` : ""}` : `HTTP ${status}`,
  };
}

async function graph(path: string, init: RequestInit) {
  return fetch(`https://graph.facebook.com/${path}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
}

/** Telefon numarası kaynağını okuyarak token + phone number id doğrular. */
export async function testConnection(config?: WhatsAppConfig): Promise<SendResult> {
  const wa = config ?? (await getWhatsAppConfig());
  if (!wa.phoneNumberId || !wa.token) {
    return {
      ok: false,
      error: "Telefon numarası ID ve erişim anahtarı gerekli.",
      details: "Meta → WhatsApp → API Setup ekranından alın.",
    };
  }

  try {
    const res = await graph(
      `${wa.apiVersion}/${wa.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,platform_type`,
      { headers: { Authorization: `Bearer ${wa.token}` } },
    );
    const body = await res.json().catch(() => null);
    if (!res.ok) return graphError(res.status, body);

    const data = body as {
      display_phone_number?: string;
      verified_name?: string;
      quality_rating?: string;
      platform_type?: string;
    };

    return {
      ok: true,
      error: undefined,
      details: [
        data.display_phone_number && `Numara: ${data.display_phone_number}`,
        data.verified_name && `İşletme adı: ${data.verified_name}`,
        data.quality_rating && `Kalite: ${data.quality_rating}`,
        data.platform_type && `Platform: ${data.platform_type}`,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  } catch (error) {
    return {
      ok: false,
      error: "Graph API'ye ulaşılamadı.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendTemplate(
  to: string,
  template: string,
  bodyParams: string[],
  language = "tr",
): Promise<SendResult> {
  const wa = await getWhatsAppConfig();
  const target = to.replace(/\D/g, "");

  if (!wa.enabled || !wa.token || !wa.phoneNumberId) {
    console.log(
      `[whatsapp:dry-run] -> ${target} template=${template} params=${JSON.stringify(bodyParams)}`,
    );
    return { ok: true, dryRun: true };
  }

  try {
    const res = await graph(`${wa.apiVersion}/${wa.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${wa.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: target,
        type: "template",
        template: {
          name: template,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) return graphError(res.status, body);

    const messageId = (body as { messages?: { id?: string }[] })?.messages?.[0]?.id;
    return { ok: true, details: messageId ? `Mesaj ID: ${messageId}` : undefined };
  } catch (error) {
    return {
      ok: false,
      error: "Mesaj gönderilemedi.",
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function sendOtp(phone: string, code: string) {
  const { templates } = await getWhatsAppConfig();
  return sendTemplate(phone, templates.otp, [code]);
}

export async function sendBookingConfirmation(phone: string, barber: string, dateText: string) {
  const { templates } = await getWhatsAppConfig();
  return sendTemplate(phone, templates.confirm, [barber, dateText]);
}

export async function sendReminder(phone: string, dateText: string) {
  const { templates } = await getWhatsAppConfig();
  return sendTemplate(phone, templates.reminder, [dateText]);
}
