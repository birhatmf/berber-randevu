import { db } from "./db";
import { dateKey, formatDateLong, formatMoney, timeOf, todayKey } from "./time";
import { getTelegramConfig, sendMessage } from "./telegram";

const DAY_MS = 86_400_000;

function h(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function adminChatIds(): Promise<string[]> {
  const config = await getTelegramConfig();
  if (!config.enabled) return [];
  const ids = new Set<string>();
  if (config.ownerChatId) ids.add(config.ownerChatId.trim());
  return [...ids];
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
};

/** Yeni randevuyu işletme sahibine bildirir. */
export async function notifyNewAppointment(info: NewAppointmentInfo): Promise<void> {
  const targets = await adminChatIds();
  if (targets.length === 0) return;

  const lines = [
    "📌 <b>Yeni randevu</b>",
    "",
    `👤 ${h(info.customerName || "İsimsiz")}${info.customerPhone ? ` · ${h(info.customerPhone)}` : ""}`,
    `💈 ${h(info.barberName)}`,
    `✂️ ${h(info.serviceName ?? "Hizmet")}${info.durationMin ? ` (${info.durationMin} dk)` : ""}`,
    `📅 <b>${h(formatDateLong(dateKey(info.start)))} · ${h(timeOf(info.start))}</b>`,
  ];
  if (info.source === "walkin") lines.push("🚶 Walk-in");

  const html = lines.join("\n");
  for (const chatId of targets) await sendMessage(chatId, html);
}

/** Müşteri kendi randevusunu iptal ettiğinde sahibi bilgilendirir. */
export async function notifyAdminCancelled(info: {
  customerName: string;
  barberName: string;
  start: Date;
}): Promise<void> {
  const targets = await adminChatIds();
  if (targets.length === 0) return;

  const html = [
    "❌ <b>Müşteri randevuyu iptal etti</b>",
    "",
    `👤 ${h(info.customerName || "İsimsiz")}`,
    `💈 ${h(info.barberName)}`,
    `📅 ${h(formatDateLong(dateKey(info.start)))} · ${h(timeOf(info.start))}`,
  ].join("\n");

  for (const chatId of targets) await sendMessage(chatId, html);
}

/** Panelden onaylanan randevu için sahibe bilgi. */
export async function notifyAdminConfirmed(info: {
  customerName: string;
  barberName: string;
  start: Date;
}): Promise<void> {
  const targets = await adminChatIds();
  if (targets.length === 0) return;

  const html = [
    "✅ <b>Randevu onaylandı</b>",
    "",
    `👤 ${h(info.customerName || "İsimsiz")}`,
    `💈 ${h(info.barberName)}`,
    `📅 ${h(formatDateLong(dateKey(info.start)))} · ${h(timeOf(info.start))}`,
  ].join("\n");

  for (const chatId of targets) await sendMessage(chatId, html);
}

// --- Gün listesi (/randevularim) ---

const STATUS_LABEL: Record<string, string> = {
  confirmed: "onaylı",
  done: "geldi",
  no_show: "gelmedi",
  cancelled: "iptal",
};

export async function dayListHtml(
  day: string,
  barberId?: string,
): Promise<{ html: string; count: number }> {
  const start = new Date(Date.parse(day + "T00:00:00Z") - 3 * 3600_000);
  const end = new Date(start.getTime() + DAY_MS);

  const rows = await db.appointment.findMany({
    where: {
      start: { gte: start, lt: end },
      status: { not: "cancelled" },
      ...(barberId ? { barberId } : {}),
    },
    include: {
      service: { select: { name: true, price: true } },
      barber: { select: { name: true } },
    },
    orderBy: { start: "asc" },
  });

  const real = rows.filter((r) => r.type === "appointment");
  const revenue = real
    .filter((r) => r.status === "done")
    .reduce((sum, r) => sum + (r.service?.price ?? 0), 0);

  if (rows.length === 0) {
    return {
      count: 0,
      html: [
        `📋 <b>${h(formatDateLong(day))}</b>`,
        "",
        "Bu gün için randevu yok.",
      ].join("\n"),
    };
  }

  const lines = [
    `📋 <b>${h(formatDateLong(day))}</b>`,
    "",
    `Toplam <b>${real.length}</b> randevu · ${rows.length - real.length} bloke`,
  ];
  if (revenue > 0) lines.push(`💰 Tahsil edilen: <b>${h(formatMoney(revenue))}</b>`);

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = groups.get(row.barber.name) ?? [];
    list.push(row);
    groups.set(row.barber.name, list);
  }

  for (const [barberName, list] of groups) {
    const realCount = list.filter((r) => r.type === "appointment").length;
    lines.push("", `<b>💈 ${h(barberName)}</b> — ${realCount} randevu`);
    for (const row of list) {
      if (row.type === "block") {
        lines.push(`  • ${timeOf(row.start)} — 🚫 ${h(row.note || "Mola")}`);
        continue;
      }
      const status = STATUS_LABEL[row.status] ?? row.status;
      const service = row.service?.name ? ` · ${h(row.service.name)}` : "";
      const customer = h(row.customerName || "İsimsiz");
      lines.push(`  • <b>${timeOf(row.start)}</b> ${customer}${service} <i>(${status})</i>`);
    }
  }

  return { html: lines.join("\n"), count: real.length };
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

/** Günlük özeti işletme sahibine gönderir. */
export async function sendDailySummary(day = todayKey()): Promise<{ ok: boolean; recipients: number }> {
  const targets = await adminChatIds();
  if (targets.length === 0) return { ok: false, recipients: 0 };

  const summary = await buildDailySummary(day);
  const html = summaryHtml(summary);

  for (const chatId of targets) await sendMessage(chatId, html);
  return { ok: true, recipients: targets.length };
}
