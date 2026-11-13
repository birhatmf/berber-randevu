import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dateTimeOf } from "@/lib/time";
import { sendReminder } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const HOUR = 3_600_000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-cron-secret") ?? url.searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const now = new Date();
  const windows = [
    { field: "reminder24At" as const, from: 23 * HOUR, to: 25 * HOUR },
    { field: "reminder2At" as const, from: 1.5 * HOUR, to: 2.5 * HOUR },
  ];

  const report: Record<string, number> = {};

  for (const window of windows) {
    const due = await db.appointment.findMany({
      where: {
        type: "appointment",
        status: "confirmed",
        [window.field]: null,
        start: { gte: new Date(now.getTime() + window.from), lte: new Date(now.getTime() + window.to) },
      },
      include: { barber: { select: { name: true } }, service: { select: { name: true } } },
      take: 200,
    });

    let sent = 0;
    for (const appointment of due) {
      if (!appointment.customerPhone) continue;
      const result = await sendReminder(
        appointment.customerPhone,
        `${appointment.service?.name ?? "Randevu"} · ${dateTimeOf(appointment.start)} · ${appointment.barber.name}`,
      );
      if (result.ok) {
        sent++;
        await db.appointment.update({
          where: { id: appointment.id },
          data: { [window.field]: new Date() },
        });
      }
    }
    report[window.field] = sent;
  }

  return NextResponse.json({ ok: true, ...report });
}
