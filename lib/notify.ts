import { db } from "./db";
import { dateKey, formatDateLong, formatMoney, timeOf, todayKey } from "./time";
import {
  customerChatOf,
  getTelegramConfig,
  sendMessage,
  type InlineButton,
} from "./telegram";

const DAY_MS = 86_400_000;

function h(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type NewAppointmentInfo = {
  id: string;
  barberId: string;
  barberName: string;
  customerName: string;
  customerPhone: string;
  serviceName: string | null;
  durationMin: number | null;
  start: Date;
  source: string;
  status: string;
};

function newAppointmentHtml(info: NewAppointmentInfo): string {
  const lines = [
    info.status === "pending" ? "🆕 <b>Yeni randevu talebi</b>" : "📌 <b>Yeni randevu eklendi</b>",
    "",
    `👤 ${h(info.customerName || "İsimsiz")}${info.customerPhone ? ` · ${h(info.customerPhone)}` : ""}`,
    `💈 ${h(info.barberName)}`,
    `✂️ ${h(info.serviceName ?? "Hizmet")}${info.durationMin ? ` (${info.durationMin} dk)` : ""}`,
    `📅 <b>${h(formatDateLong(dateKey(info.start)))} · ${h(timeOf(info.start))}</b>`,
  ];
  if (info.source === "walkin") lines.push("🚶 Walk-in");
  return lines.join("\n");
}

/**
 * Yeni randevu talebini ilgili berbere ve işletme sahibine bildirir.
 * Onay/red butonları yalnızca onay bekleyen (pending) randevularda eklenir.
 */
export async function notifyNewAppointment(info: NewAppointmentInfo): Promise<void> {
  const config = await getTelegramConfig();
  if (!config.enabled) return;

  const barber = await db.user.findUnique({
    where: { id: info.barberId },
    select: { telegramChatId: true },
  });

  const targets = new Set<string>();
  if (barber?.telegramChatId) targets.add(barber.telegramChatId.trim());
  if (config.ownerChatId) targets.add(config.ownerChatId.trim());

  if (targets.size === 0) return;

  const buttons: InlineButton[][] =
    info.status === "pending"
      ? [
          [
            { text: "✅ Onayla", callback_data: `ap:${info.id}` },
            { text: "❌ Reddet", callback_data: `rj:${info.id}` },
          ],
        ]
      : [];

  const html = newAppointmentHtml(info);
  for (const chatId of targets) {
    await sendMessage(chatId, html, buttons.length ? buttons : undefined);
  }
}

export async function notifyConfirmed(info: {
  customerPhone: string;
  barberName: string;
  serviceName: string | null;
  start: Date;
}): Promise<void> {
  const config = await getTelegramConfig();
  if (!config.enabled) return;
  const chatId = await customerChatOf(info.customerPhone);
  if (!chatId) return;

  await sendMessage(
    chatId,
    [
      "✅ <b>Randevunuz onaylandı</b>",
      "",
      `💈 ${h(info.barberName)} · ${h(info.serviceName ?? "Hizmet")}`,
      `📅 <b>${h(formatDateLong(dateKey(info.start)))} · ${h(timeOf(info.start))}</b>`,
      "",
      "<i>Değişiklik için dükkânı arayabilirsiniz.</i>",
    ].join("\n"),
  );
}

export async function notifyCancelled(info: {
  customerPhone: string;
  barberName: string;
  start: Date;
}): Promise<void> {
  const config = await getTelegramConfig();
  if (!config.enabled) return;
  const chatId = await customerChatOf(info.customerPhone);
  if (!chatId) return;

  await sendMessage(
    chatId,
    [
      "❌ <b>Randevunuz iptal edildi</b>",
      "",
      `💈 ${h(info.barberName)}`,
      `📅 ${h(formatDateLong(dateKey(info.start)))} · ${h(timeOf(info.start))}`,
      "",
      "<i>Yeni randevu için sitemizi kullanabilirsiniz.</i>",
    ].join("\n"),
  );
}

export type DailySummary = {
  dateKey: string;
  total: number;
  confirmed: number;
  pending: number;
  done: number;
  noShow: number;
  cancelled: number;
  revenue: number;
  byBarber: { name: string; count: number; revenue: number }[];
  tomorrow: { time: string; name: string; barber: string }[];
};

export async function buildDailySummary(day: string): Promise<DailySummary> {
  const start = new Date(Date.parse(day + "T00:00:00Z") - 3 * 3600_000);
  const end = new Date(start.getTime() + DAY_MS);
  const nextEnd = new Date(end.getTime() + DAY_MS);

  const [rows, tomorrowRows] = await Promise.all([
    db.appointment.findMany({
      where: { start: { gte: start, lt: end }, type: "appointment" },
      include: {
        service: { select: { name: true, price: true } },
        barber: { select: { name: true } },
      },
      orderBy: { start: "asc" },
    }),
    db.appointment.findMany({
      where: { start: { gte: end, lt: nextEnd }, type: "appointment", status: { not: "cancelled" } },
      include: { barber: { select: { name: true } } },
      orderBy: { start: "asc" },
    }),
  ]);

  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const revenue = rows
    .filter((r) => r.status === "done")
    .reduce((sum, r) => sum + (r.service?.price ?? 0), 0);

  const barberMap = new Map<string, { count: number; revenue: number }>();
  for (const row of rows) {
    if (row.status === "cancelled") continue;
    const entry = barberMap.get(row.barber.name) ?? { count: 0, revenue: 0 };
    entry.count += 1;
    if (row.status === "done") entry.revenue += row.service?.price ?? 0;
    barberMap.set(row.barber.name, entry);
  }

  return {
    dateKey: day,
    total: rows.filter((r) => r.status !== "cancelled").length,
    confirmed: count("confirmed"),
    pending: count("pending"),
    done: count("done"),
    noShow: count("no_show"),
    cancelled: count("cancelled"),
    revenue,
    byBarber: [...barberMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count),
    tomorrow: tomorrowRows.map((r) => ({
      time: timeOf(r.start),
      name: r.customerName,
      barber: r.barber.name,
    })),
  };
}

export function summaryHtml(s: DailySummary): string {
  const lines = [
    `📊 <b>${h(formatDateLong(s.dateKey))} — Günlük özet</b>`,
    "",
    `Randevu: <b>${s.total}</b> · Geldi: ${s.done} · Gelmedi: ${s.noShow} · İptal: ${s.cancelled}`,
  ];
  if (s.pending > 0) lines.push(`⚠️ Onay bekleyen: <b>${s.pending}</b>`);
  lines.push(`💰 Ciro (geldi): <b>${h(formatMoney(s.revenue))}</b>`);

  if (s.byBarber.length > 0) {
    lines.push("", "<b>Berberler</b>");
    for (const b of s.byBarber) {
      lines.push(`💈 ${h(b.name)} — ${b.count} randevu, ${h(formatMoney(b.revenue))}`);
    }
  }

  lines.push("", "<b>Yarın</b>");
  if (s.tomorrow.length === 0) {
    lines.push("Randevu yok.");
  } else {
    for (const t of s.tomorrow.slice(0, 12)) {
      lines.push(`• ${t.time} — ${h(t.name || "İsimsiz")} (${h(t.barber)})`);
    }
    if (s.tomorrow.length > 12) lines.push(`… ve ${s.tomorrow.length - 12} randevu daha`);
  }
  return lines.join("\n");
}

/** Günlük özeti sahibe (ve varsa tüm berberlere) gönderir. */
export async function sendDailySummary(day = todayKey()): Promise<{ ok: boolean; recipients: number }> {
  const config = await getTelegramConfig();
  if (!config.enabled) return { ok: false, recipients: 0 };

  const summary = await buildDailySummary(day);
  const html = summaryHtml(summary);

  const targets = new Set<string>();
  if (config.ownerChatId) targets.add(config.ownerChatId.trim());

  const barbers = await db.user.findMany({
    where: { role: "barber", active: true, telegramChatId: { not: null } },
    select: { telegramChatId: true },
  });
  for (const b of barbers) if (b.telegramChatId) targets.add(b.telegramChatId.trim());

  for (const chatId of targets) await sendMessage(chatId, html);
  return { ok: true, recipients: targets.size };
}
