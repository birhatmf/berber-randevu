import { PrismaClient } from "@prisma/client";
import { availableSlots, createAppointment, BookingError } from "../lib/booking";
import { addDays, todayKey } from "../lib/time";

const db = new PrismaClient();

async function main() {
  const barber = await db.user.findFirst({ where: { role: "barber" } });
  const service = await db.service.findFirst({ where: { name: "Saç Kesimi" } });
  if (!barber || !service) throw new Error("Seed eksik");

  const date = addDays(todayKey(), 2);
  const slots = await availableSlots(barber.id, date, service.id);
  if (slots.length === 0) throw new Error("Slot yok — çalışma saati/seed kontrol edin");

  const target = slots[3];
  const created = await createAppointment({
    barberId: barber.id,
    serviceId: service.id,
    date,
    startMin: target,
    customerName: "Test Müşteri",
    customerPhone: "+905551112233",
    source: "online",
  });

  const after = await availableSlots(barber.id, date, service.id);
  if (after.includes(target)) throw new Error("Dolu slot hâlâ açık görünüyor");

  let clashed = false;
  try {
    await createAppointment({
      barberId: barber.id,
      serviceId: service.id,
      date,
      startMin: target,
      customerName: "İkinci",
      customerPhone: "+905551112244",
      source: "online",
    });
  } catch (error) {
    if (error instanceof BookingError) clashed = true;
    else throw error;
  }
  if (!clashed) throw new Error("Çakışan randevu engellenmedi");

  console.log(
    JSON.stringify({
      ok: true,
      date,
      slot: target,
      appointment: created.id,
      slotsBefore: slots.length,
      slotsAfter: after.length,
      ids: { barber: barber.id, service: service.id },
    }),
  );

  await db.appointment.delete({ where: { id: created.id } });
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exit(1);
});
