import { NextResponse } from "next/server";
import { availableSlots } from "@/lib/booking";
import { isValidDateKey } from "@/lib/time";

export async function POST(request: Request) {
  let body: { barberId?: string; date?: string; serviceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { barberId, date, serviceId } = body;
  if (!barberId || !serviceId || !date || !isValidDateKey(date)) {
    return NextResponse.json({ error: "Eksik alan." }, { status: 400 });
  }

  const slots = await availableSlots(barberId, date, serviceId);
  return NextResponse.json({ slots });
}
