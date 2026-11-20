import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dateKey, formatDateLong, timeOf } from "@/lib/time";
import {
  answerCallback,
  editMessage,
  escapeHtml as h,
  getTelegramConfig,
  linkCustomerChat,
  sendMessage,
} from "@/lib/telegram";
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

  const head =
    status === "confirmed"
      ? "✅ <b>Randevu onaylandı</b>"
      : "❌ <b>Randevu reddedildi</b>";

  const body = [
    head,
    "",
    `👤 ${h(appointment.customerName || "İsimsiz")}`,
    `💈 ${h(appointment.barber.name)} · ${h(appointment.service?.name ?? "Hizmet")}`,
    `📅 ${h(formatDateLong(dateKey(appointment.start)))} · ${h(timeOf(appointment.start))}`,
  ].join("\n");

  if (chatId && messageId) {
    await editMessage(String(chatId), messageId, body, []);
  }
  await answerCallback(query.id, status === "confirmed" ? "Onaylandı." : "Reddedildi.");
}

async function handleMessage(message: NonNullable<Update["message"]>) {
  const chatId = message.chat?.id;
  const text = (message.text ?? "").trim();
  if (!chatId || !text) return;

  if (text.startsWith("/start")) {
    const payload = text.split(/\s+/)[1] ?? "";

    // Derin baglanti: /start <telefon>  -> musteri sohbetini numarasiyla eslestir
    if (/^\+?\d{10,15}$/.test(payload)) {
      const phone = payload.startsWith("+") ? payload : `+${payload}`;
      await linkCustomerChat(phone, String(chatId));
      await sendMessage(
        String(chatId),
        "🔗 <b>Telefonunuz bağlandı.</b>\nRandevunuz onaylandığında veya iptal edildiğinde buradan haber vereceğiz.",
      );
      return;
    }

    // Panelde chat ID'si kayitli bir berber mi?
    const barber = await db.user.findFirst({
      where: { telegramChatId: String(chatId) },
      select: { name: true, role: true },
    });

    if (barber) {
      await sendMessage(
        String(chatId),
        [
          `👋 Merhaba <b>${h(barber.name)}</b>,`,
          "bu sohbet berber panelinize bağlı. Yeni randevular ve akşam özeti buraya gelecek.",
        ].join("\n"),
      );
      return;
    }

    await sendMessage(
      String(chatId),
      [
        "👋 <b>Berber Randevu botu</b>",
        "",
        "Bu kimliği yönetici panelinde <b>Telegram → Sahip chat ID</b> alanına yapıştırın:",
        "",
        `<code>${chatId}</code>`,
        "",
        "<i>Müşteriler için: randevu sonuç ekranındaki “Telegram'ı bağla” düğmesini kullanın.</i>",
      ].join("\n"),
    );
  }
}
