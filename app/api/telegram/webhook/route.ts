import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, dateKey, formatDateLong, timeOf, todayKey } from "@/lib/time";
import {
  answerCallback,
  editMessage,
  escapeHtml as h,
  getTelegramConfig,
  sendMessage,
} from "@/lib/telegram";
import { dayListHtml } from "@/lib/notify";
import { sendBookingConfirmation } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

type Update = {
  message?: { chat?: { id?: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat?: { id?: number }; message_id?: number } };
};

export async function POST(request: Request) {
  const config = await getTelegramConfig();

  // Telegram, setWebhook'ta verilen secret'i bu baslikta yollar.
  if (config.webhookSecret) {
    const provided = request.headers.get("x-telegram-bot-api-secret-token");
    if (provided !== config.webhookSecret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let update: Update;
  try {
    update = (await request.json()) as Update;
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message) await handleMessage(update.message);
  } catch (error) {
    console.error("[telegram:webhook]", error);
  }

  return NextResponse.json({ ok: true });
}

async function handleCallback(query: NonNullable<Update["callback_query"]>) {
  const chatId = query.message?.chat?.id;
  const messageId = query.message?.message_id;
  const data = query.data ?? "";

  const [action, appointmentId] = data.split(":");
  if (!appointmentId || (action !== "ap" && action !== "rj")) {
    await answerCallback(query.id, "Bilinmeyen işlem.");
    return;
  }

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: { barber: { select: { name: true } }, service: { select: { name: true } } },
  });

  if (!appointment || appointment.type !== "appointment") {
    await answerCallback(query.id, "Randevu bulunamadı.");
    return;
  }
  if (appointment.status !== "pending") {
    await answerCallback(query.id, "Bu talep zaten işlenmiş.");
    return;
  }

  const status = action === "ap" ? "confirmed" : "cancelled";
  await db.appointment.update({ where: { id: appointment.id }, data: { status } });

  if (status === "confirmed" && appointment.customerPhone) {
    await sendBookingConfirmation(
      appointment.customerPhone,
      appointment.barber.name,
      `${formatDateLong(dateKey(appointment.start))} · ${timeOf(appointment.start)}`,
    );
  }

  const body = [
    status === "confirmed" ? "✅ <b>Randevu onaylandı</b>" : "❌ <b>Randevu reddedildi</b>",
    "",
    `👤 ${h(appointment.customerName || "İsimsiz")}`,
    `💈 ${h(appointment.barber.name)} · ${h(appointment.service?.name ?? "Hizmet")}`,
    `📅 ${h(formatDateLong(dateKey(appointment.start)))} · ${h(timeOf(appointment.start))}`,
  ].join("\n");

  if (chatId && messageId) await editMessage(String(chatId), messageId, body, []);
  await answerCallback(query.id, status === "confirmed" ? "Onaylandı." : "Reddedildi.");
}

async function handleMessage(message: NonNullable<Update["message"]>) {
  const chatId = message.chat?.id;
  const text = (message.text ?? "").trim();
  if (!chatId) return;

  const config = await getTelegramConfig();
  const isAdmin =
    Boolean(config.ownerChatId) && String(chatId) === config.ownerChatId.trim();

  // Bot admine ozel: taninmayan sohbetlere yalnizca kimlik bilgisi ver.
  if (!isAdmin) {
    if (text.startsWith("/start")) {
      await sendMessage(
        String(chatId),
        [
          "👋 Bu bot işletme sahibine özeldir.",
          "",
          "Yönetici iseniz bu kimliği panelde <b>Telegram → Sahip chat ID</b> alanına yapıştırın:",
          "",
          `<code>${chatId}</code>`,
        ].join("\n"),
      );
    }
    return;
  }

  const [rawCommand, ...args] = text.split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@.*$/, "");

  if (command === "/start" || command === "/yardim" || command === "/help") {
    await sendMessage(
      String(chatId),
      [
        "👋 <b>Berber Randevu — yönetici botu</b>",
        "",
        "<b>Komutlar</b>",
        "/randevularim — bugünün randevuları",
        "/randevularim yarin — yarının randevuları",
        "/randevularim 2026-11-25 — belirli bir gün",
        "/ozet — günlük özeti hemen gönder",
        "",
        "Yeni randevular ve her akşam 21:00 özeti otomatik gelir.",
      ].join("\n"),
    );
    return;
  }

  if (command === "/randevularim" || command === "/randevular") {
    await sendDayList(String(chatId), args[0]);
    return;
  }

  if (command === "/ozet" || command === "/summary") {
    const { sendDailySummary } = await import("@/lib/notify");
    const result = await sendDailySummary();
    if (result.recipients === 0) {
      await sendMessage(String(chatId), "Gönderilemedi: bildirim ayarları eksik.");
    }
    return;
  }

  await sendMessage(String(chatId), "Komut anlaşılmadı. /yardim yazın.");
}

async function sendDayList(chatId: string, arg?: string) {
  const day = resolveDay(arg);
  if (!day) {
    await sendMessage(
      chatId,
      "Tarihi anlayamadım.\nÖrnek: <code>/randevularim</code>, <code>/randevularim yarin</code>, <code>/randevularim 2026-11-25</code>",
    );
    return;
  }

  const { html, count } = await dayListHtml(day);
  await sendMessage(chatId, html);

  if (count > 0) {
    await sendMessage(
      chatId,
      "İpucu: <code>/randevularim yarin</code> ile yarının listesini alabilirsiniz.",
    );
  }
}

function resolveDay(arg?: string): string | null {
  if (!arg) return todayKey();
  const value = arg.trim().toLowerCase();

  if (value === "bugun" || value === "bugün" || value === "today") return todayKey();
  if (value === "yarin" || value === "yarın" || value === "tomorrow") return addDays(todayKey(), 1);

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(value + "T00:00:00Z");
    if (!Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value) return value;
    return null;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
    const [dd, mm, yyyy] = value.split(".");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}
