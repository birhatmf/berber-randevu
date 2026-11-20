import { NextResponse } from "next/server";
import { sendDailySummary, buildDailySummary, summaryHtml } from "@/lib/notify";
import { todayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const ISTANBUL_OFFSET_MIN = 180;
const SUMMARY_HOUR = 21;

function istanbulNow() {
  const shifted = new Date(Date.now() + ISTANBUL_OFFSET_MIN * 60_000);
  return {
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    dayKey: shifted.toISOString().slice(0, 10),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const now = istanbulNow();

  // Cron 15 dakikada bir cagrilir; 21:00 penceresini yakalar. ?force=1 test icin.
  const force = url.searchParams.get("force") === "1";
  const inWindow = now.hour === SUMMARY_HOUR && now.minute < 15;

  if (!force && !inWindow) {
    return NextResponse.json({ skipped: true, istanbul: now });
  }

  // Ayni gun iki kez gondermeyi engelle.
  const day = now.dayKey;
  if (!force) {
    const { db } = await import("@/lib/db");
    const marker = await db.setting.findUnique({ where: { key: "tgLastSummaryDay" } });
    if (marker?.value === day) {
      return NextResponse.json({ skipped: true, reason: "already-sent", day });
    }
    await db.setting.upsert({
      where: { key: "tgLastSummaryDay" },
      update: { value: day },
      create: { key: "tgLastSummaryDay", value: day },
    });
  }

  const result = await sendDailySummary(day);
  return NextResponse.json({ ok: result.ok, day, recipients: result.recipients });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const day = typeof body?.date === "string" ? body.date : todayKey();
  const summary = await buildDailySummary(day);
  return NextResponse.json({ preview: summaryHtml(summary) });
}
