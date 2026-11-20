import { db } from "./db";

export const TG_KEYS = {
  enabled: "tgEnabled",
  token: "tgToken",
  ownerChatId: "tgOwnerChatId",
  botUsername: "tgBotUsername",
  webhookSecret: "tgWebhookSecret",
} as const;

export type TelegramConfig = {
  enabled: boolean;
  token: string;
  ownerChatId: string;
  botUsername: string;
  webhookSecret: string;
};

export type TelegramResult = {
  ok: boolean;
  dryRun?: boolean;
  error?: string;
  details?: string;
};

export type InlineButton = { text: string; callback_data: string };

export async function getTelegramConfig(): Promise<TelegramConfig> {
  const rows = await db.setting.findMany({ where: { key: { in: Object.values(TG_KEYS) } } });
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const pick = (key: string, fallback = "") => (map[key] ?? "").trim() || fallback;

  const token = pick(TG_KEYS.token, process.env.TELEGRAM_BOT_TOKEN ?? "");
  return {
    enabled: pick(TG_KEYS.enabled, token ? "1" : "0") === "1",
    token,
    ownerChatId: pick(TG_KEYS.ownerChatId, process.env.TELEGRAM_OWNER_CHAT_ID ?? ""),
    botUsername: pick(TG_KEYS.botUsername),
    webhookSecret: pick(TG_KEYS.webhookSecret, process.env.TELEGRAM_WEBHOOK_SECRET ?? ""),
  };
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function call(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; body: any; status: number }> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok && Boolean(body?.ok), body, status: res.status };
}

function failure(body: any, status: number): TelegramResult {
  return {
    ok: false,
    error: body?.description ?? `Telegram API ${status}`,
    details: body?.error_code ? `kod ${body.error_code}` : `HTTP ${status}`,
  };
}

export async function sendMessage(
  chatId: string,
  html: string,
  buttons?: InlineButton[][],
): Promise<TelegramResult> {
  const config = await getTelegramConfig();
  const target = String(chatId ?? "").trim();
  if (!target) return { ok: false, error: "Alıcı yok." };

  if (!config.enabled || !config.token) {
    console.log(`[telegram:dry-run] -> ${target}\n${html.replace(/<[^>]+>/g, "")}`);
    return { ok: true, dryRun: true };
  }

  try {
    const { ok, body, status } = await call(config.token, "sendMessage", {
      chat_id: target,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      ...(buttons?.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
    });
    if (!ok) return failure(body, status);
    return { ok: true, details: String(body?.result?.message_id ?? "") };
  } catch (error) {
    return { ok: false, error: "Telegram'a ulaşılamadı.", details: String(error) };
  }
}

export async function editMessage(
  chatId: string,
  messageId: number | string,
  html: string,
  buttons?: InlineButton[][],
): Promise<TelegramResult> {
  const config = await getTelegramConfig();
  if (!config.enabled || !config.token) return { ok: true, dryRun: true };

  try {
    const { ok, body, status } = await call(config.token, "editMessageText", {
      chat_id: chatId,
      message_id: Number(messageId),
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: buttons ?? [] },
    });
    if (!ok) return failure(body, status);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Telegram'a ulaşılamadı.", details: String(error) };
  }
}

export async function answerCallback(callbackId: string, text: string): Promise<void> {
  const config = await getTelegramConfig();
  if (!config.enabled || !config.token) return;
  await call(config.token, "answerCallbackQuery", { callback_query_id: callbackId, text }).catch(
    () => null,
  );
}

export async function getMe(): Promise<{ ok: boolean; username?: string; name?: string; error?: string }> {
  const config = await getTelegramConfig();
  if (!config.token) return { ok: false, error: "Bot token'ı girilmemiş." };
  try {
    const { ok, body, status } = await call(config.token, "getMe", {});
    if (!ok) return { ok: false, error: failure(body, status).error };
    return { ok: true, username: body?.result?.username, name: body?.result?.first_name };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function setWebhook(url: string, secret: string): Promise<TelegramResult> {
  const config = await getTelegramConfig();
  if (!config.token) return { ok: false, error: "Bot token'ı girilmemiş." };
  try {
    const { ok, body, status } = await call(config.token, "setWebhook", {
      url,
      secret_token: secret || undefined,
      allowed_updates: ["message", "callback_query"],
    });
    if (!ok) return failure(body, status);
    return { ok: true, details: "Webhook kuruldu." };
  } catch (error) {
    return { ok: false, error: "Webhook kurulamadı.", details: String(error) };
  }
}

export async function sendTest(chatId: string): Promise<TelegramResult> {
  return sendMessage(chatId, "✅ <b>Bağlantı çalışıyor.</b>\nBerber paneli test mesajı.");
}
