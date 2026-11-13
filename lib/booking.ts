import { db } from "./db";
import { getNumbers } from "./settings";
import { computeSlots, type Interval } from "./slots";
import { isValidDateKey, localDateTime, minutesOfDay, weekdayOf } from "./time";

const DAY_MS = 86_400_000;

export async function busyIntervals(barberId: string, dateStr: string): Promise<Interval[]> {
  const dayStart = localDateTime(dateStr, 0);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  const rows = await db.appointment.findMany({
    where: {
      barberId,
      status: { not: "cancelled" },
      start: { lt: dayEnd },
      end: { gt: dayStart },
    },
    select: { start: true, end: true },
  });

  return rows.map((r) => ({
    startMin: r.start <= dayStart ? 0 : minutesOfDay(r.start),
    endMin: r.end >= dayEnd ? 1440 : minutesOfDay(r.end),
  }));
}

export async function availableSlots(barberId: string, dateStr: string, serviceId: string) {
  if (!isValidDateKey(dateStr)) return [];
  const service = await db.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) return [];

  const segments = await db.workHours.findMany({
    where: { barberId, weekday: weekdayOf(dateStr) },
    orderBy: { startMin: "asc" },
    select: { startMin: true, endMin: true },
  });
  if (segments.length === 0) return [];

  const [busy, numbers] = await Promise.all([busyIntervals(barberId, dateStr), getNumbers()]);

  return computeSlots({
    segments,
    busy,
    durationMin: service.durationMin,
    stepMin: numbers.slotStep,
    dateStr,
    now: new Date(),
    minLeadMin: numbers.minLeadMin,
    maxDays: numbers.maxDays,
  });
}

export class BookingError extends Error {}

export type CreateAppointmentInput = {
  barberId: string;
  serviceId: string;
  date: string;
  startMin: number;
  customerName?: string;
  customerPhone?: string;
  status?: string;
  type?: string;
  source?: string;
  note?: string;
};

export async function createAppointment(input: CreateAppointmentInput) {
  const service = await db.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) throw new BookingError("Hizmet bulunamadı.");
  if (!isValidDateKey(input.date)) throw new BookingError("Geçersiz tarih.");

  const barber = await db.user.findUnique({ where: { id: input.barberId } });
  if (!barber || !barber.active) throw new BookingError("Berber bulunamadı.");

  const start = localDateTime(input.date, input.startMin);
  const end = new Date(start.getTime() + service.durationMin * 60_000);

  if (start.getTime() < Date.now()) {
    throw new BookingError("Geçmiş bir saate randevu oluşturulamaz.");
  }

  return db.$transaction(async (tx) => {
    const clash = await tx.appointment.findFirst({
      where: {
        barberId: input.barberId,
        status: { not: "cancelled" },
        start: { lt: end },
        end: { gt: start },
      },
      select: { id: true },
    });
    if (clash) {
      throw new BookingError("Bu saat az önce doldu. Lütfen başka bir saat seçin.");
    }

    return tx.appointment.create({
      data: {
        barberId: input.barberId,
        serviceId: input.serviceId,
        start,
        end,
        customerName: input.customerName?.trim() ?? "",
        customerPhone: input.customerPhone ?? "",
        status: input.status ?? "confirmed",
        type: input.type ?? "appointment",
        source: input.source ?? "manual",
        note: input.note?.trim() || null,
      },
    });
  });
}

export async function createBlock(input: {
  barberId: string;
  date: string;
  startMin: number;
  durationMin: number;
  note?: string;
}) {
  if (!isValidDateKey(input.date)) throw new BookingError("Geçersiz tarih.");
  const start = localDateTime(input.date, input.startMin);
  const end = new Date(start.getTime() + input.durationMin * 60_000);

  return db.$transaction(async (tx) => {
    const clash = await tx.appointment.findFirst({
      where: {
        barberId: input.barberId,
        status: { not: "cancelled" },
        start: { lt: end },
        end: { gt: start },
      },
      select: { id: true },
    });
    if (clash) throw new BookingError("Bu saatte zaten bir kayıt var.");

    return tx.appointment.create({
      data: {
        barberId: input.barberId,
        start,
        end,
        customerName: "Bloke",
        customerPhone: "",
        type: "block",
        source: "manual",
        note: input.note?.trim() || "Mola",
      },
    });
  });
}

export async function listDay(dateStr: string, barberId?: string) {
  const dayStart = localDateTime(dateStr, 0);
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  return db.appointment.findMany({
    where: {
      start: { lt: dayEnd },
      end: { gt: dayStart },
      ...(barberId ? { barberId } : {}),
    },
    orderBy: { start: "asc" },
    include: { service: true, barber: { select: { id: true, name: true } } },
  });
}

export async function listRange(fromDate: string, toDate: string, barberId?: string) {
  const from = localDateTime(fromDate, 0);
  const to = new Date(localDateTime(toDate, 0).getTime() + DAY_MS);
  return db.appointment.findMany({
    where: {
      start: { gte: from, lt: to },
      status: { not: "cancelled" },
      ...(barberId ? { barberId } : {}),
    },
    orderBy: { start: "asc" },
    include: { service: true, barber: { select: { id: true, name: true } } },
  });
}
