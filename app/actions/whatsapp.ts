"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { getWhatsAppConfig, testConnection, sendTemplate, WA_KEYS } from "@/lib/whatsapp";
import type { ActionState } from "./types";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session.user;
}

async function setValue(key: string, value: string) {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

export async function saveWhatsAppSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const token = String(formData.get("token") ?? "").trim();
  const phoneNumberId = String(formData.get("phoneNumberId") ?? "").trim();
  if (phoneNumberId && !/^\d{6,}$/.test(phoneNumberId)) {
    return { error: "Telefon numarası ID yalnızca rakamlardan oluşur." };
  }

  const version = String(formData.get("apiVersion") ?? "").trim() || "v26.0";
  if (!/^v\d+\.\d+$/.test(version)) {
    return { error: "API sürümü v26.0 gibi olmalı." };
  }

  await setValue(WA_KEYS.enabled, formData.get("enabled") === "on" ? "1" : "0");
  await setValue(WA_KEYS.apiVersion, version);
  await setValue(WA_KEYS.phoneNumberId, phoneNumberId);
  await setValue(WA_KEYS.businessId, String(formData.get("businessId") ?? "").trim());
  await setValue(WA_KEYS.verifyToken, String(formData.get("verifyToken") ?? "").trim());
  await setValue(WA_KEYS.otp, String(formData.get("templateOtp") ?? "").trim() || "otp_kodu");
  await setValue(WA_KEYS.confirm, String(formData.get("templateConfirm") ?? "").trim() || "randevu_onayi");
  await setValue(WA_KEYS.reminder, String(formData.get("templateReminder") ?? "").trim() || "randevu_hatirlatma");

  // Boş bırakılan anahtar mevcut değeri korur.
  if (token) await setValue(WA_KEYS.token, token);

  revalidatePath("/panel/whatsapp");
  return { ok: true, message: "WhatsApp ayarları kaydedildi." };
}

export async function testWhatsAppConnection(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const config = await getWhatsAppConfig();
  const result = await testConnection(config);

  if (!result.ok) {
    return { error: result.error ?? "Bağlantı kurulamadı.", details: result.details };
  }

  return {
    ok: true,
    message: "Bağlantı başarılı.",
    details: result.details,
  };
}

const testSchema = z.object({
  to: z.string().trim().min(10, "Alıcı numarası girin."),
  template: z.string().trim().min(1, "Şablon seçin."),
  params: z.string().trim().max(300).optional().default(""),
});

export async function sendWhatsAppTest(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const parsed = testSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Alanları kontrol edin." };

  const phone = normalizePhone(parsed.data.to);
  if (!phone) return { error: "Telefon geçersiz. Örnek: 0532 123 45 67" };

  const params = parsed.data.params
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  const result = await sendTemplate(phone, parsed.data.template, params);

  if (result.dryRun) {
    return {
      error: "Mesaj gönderilmedi: WhatsApp bağlantısı pasif veya anahtar eksik.",
      details: "Ayarları kaydedip 'Bağlantıyı test et' ile doğrulayın.",
    };
  }
  if (!result.ok) {
    return { error: result.error ?? "Mesaj gönderilemedi.", details: result.details };
  }

  return { ok: true, message: "Test mesajı gönderildi.", details: result.details };
}

export async function clearWhatsAppToken(): Promise<void> {
  const user = await requireAdmin();
  if (!user) return;
  await db.setting.deleteMany({ where: { key: WA_KEYS.token } });
  await setValue(WA_KEYS.enabled, "0");
  revalidatePath("/panel/whatsapp");
}
