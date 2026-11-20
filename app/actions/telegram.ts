"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getTelegramConfig, getMe, sendTest, setWebhook, TG_KEYS } from "@/lib/telegram";
import { sendDailySummary } from "@/lib/notify";
import type { ActionState } from "./types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session.user;
}

async function setValue(key: string, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function saveTelegramSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const token = String(formData.get("token") ?? "").trim();
  if (token && !/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) {
    return { error: "Bot token'ı 123456:ABC… biçiminde olmalı." };
  }

  const ownerChatId = String(formData.get("ownerChatId") ?? "").trim();
  if (ownerChatId && !/^-?\d{5,}$/.test(ownerChatId)) {
    return { error: "Chat ID rakamlardan oluşur (gruplarda -100… ile başlar)." };
  }

  await setValue(TG_KEYS.enabled, formData.get("enabled") === "on" ? "1" : "0");
  await setValue(TG_KEYS.ownerChatId, ownerChatId);
  await setValue(TG_KEYS.botUsername, String(formData.get("botUsername") ?? "").trim().replace(/^@/, ""));
  if (token) await setValue(TG_KEYS.token, token);

  revalidatePath("/panel/telegram");
  return { ok: true, message: "Telegram ayarları kaydedildi." };
}

export async function testTelegramConnection(): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const me = await getMe();
  if (!me.ok) return { error: me.error ?? "Bağlantı kurulamadı." };

  await setValue(TG_KEYS.botUsername, me.username ?? "");
  revalidatePath("/panel/telegram");
  return {
    ok: true,
    message: "Bağlantı başarılı.",
    details: [`Bot: @${me.username ?? "?"}`, me.name && `Ad: ${me.name}`].filter(Boolean).join(" · "),
  };
}

export async function sendTelegramTest(): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const config = await getTelegramConfig();
  if (!config.ownerChatId) return { error: "Önce sahip chat ID'sini kaydedin." };

  const result = await sendTest(config.ownerChatId);
  if (result.dryRun) {
    return { error: "Mesaj gönderilmedi: bot pasif veya token eksik." };
  }
  if (!result.ok) return { error: result.error ?? "Mesaj gönderilemedi.", details: result.details };

  return { ok: true, message: "Test mesajı gönderildi." };
}

export async function setupTelegramWebhook(appUrl: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  let secret = (await db.setting.findUnique({ where: { key: TG_KEYS.webhookSecret } }))?.value ?? "";
  if (!secret) {
    secret = crypto.randomUUID().replace(/-/g, "");
    await setValue(TG_KEYS.webhookSecret, secret);
  }

  const result = await setWebhook(`${appUrl.replace(/\/$/, "")}/api/telegram/webhook`, secret);
  if (!result.ok) return { error: result.error ?? "Webhook kurulamadı.", details: result.details };

  revalidatePath("/panel/telegram");
  return { ok: true, message: "Webhook kuruldu.", details: `${appUrl}/api/telegram/webhook` };
}

export async function clearTelegramToken(): Promise<void> {
  const user = await requireAdmin();
  if (!user) return;
  await db.setting.deleteMany({ where: { key: TG_KEYS.token } });
  await setValue(TG_KEYS.enabled, "0");
  revalidatePath("/panel/telegram");
}

export async function sendSummaryNow(): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const result = await sendDailySummary();
  if (result.recipients === 0) {
    return { error: "Gönderilecek hedef yok (bot pasif veya chat ID tanımsız)." };
  }
  return { ok: true, message: `Özet ${result.recipients} kişiye gönderildi.` };
}

export async function saveBarberChat(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  if (!user) return;

  const barberId = String(formData.get("barberId") ?? "");
  const chatId = String(formData.get("chatId") ?? "").trim();
  if (!barberId) return;
  if (chatId && !/^-?\d{5,}$/.test(chatId)) return;

  await db.user.update({
    where: { id: barberId },
    data: { telegramChatId: chatId || null },
  });

  revalidatePath("/panel/telegram");
}
