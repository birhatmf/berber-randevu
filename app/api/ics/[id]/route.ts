import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { toIcs } from "@/lib/ics";
import { dateTimeOf } from "@/lib/time";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const appointment = await db.appointment.findUnique({
    where: { id },
    include: { service: true, barber: { select: { name: true } } },
  });
  if (!appointment || appointment.type !== "appointment") {
    return new Response("Randevu bulunamadı.", { status: 404 });
  }

  const settings = await getSettings();
  const body = toIcs({
    uid: appointment.id,
    title: `${appointment.service?.name ?? "Randevu"} · ${settings.shopName}`,
    description: `${appointment.barber.name} · ${dateTimeOf(appointment.start)}`,
    location: settings.address,
    start: appointment.start,
    end: appointment.end,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="randevu-${appointment.id}.ics"`,
    },
  });
}
