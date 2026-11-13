import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const SEGMENTS = [
  { startMin: 540, endMin: 780 },
  { startMin: 810, endMin: 1200 },
];

async function main() {
  const passwordHash = await bcrypt.hash("berber1234", 10);

  await db.user.upsert({
    where: { email: "admin@berber.local" },
    update: {},
    create: {
      name: "İşletme Sahibi",
      phone: "+905550000000",
      email: "admin@berber.local",
      passwordHash,
      role: "admin",
      title: "Kurucu",
    },
  });

  const barbers = [
    { name: "Ahmet Yıldız", phone: "+905550000001", email: "ahmet@berber.local", title: "Usta Berber", bio: "12 yıllık deneyim. Klasik kesim ve ustura." },
    { name: "Mehmet Kaya", phone: "+905550000002", email: "mehmet@berber.local", title: "Berber", bio: "Fade ve modern kesimler." },
    { name: "Can Demir", phone: "+905550000003", email: "can@berber.local", title: "Berber", bio: "Sakal tasarımı ve bakım." },
  ];

  for (const b of barbers) {
    const user = await db.user.upsert({
      where: { email: b.email },
      update: { name: b.name, title: b.title, bio: b.bio },
      create: { ...b, passwordHash, role: "barber" },
    });
    await db.workHours.deleteMany({ where: { barberId: user.id } });
    const days = [0, 2, 3, 4, 5, 6]; // Pazar + Salı–Cumartesi (Pazartesi kapalı)
    await db.workHours.createMany({
      data: days.flatMap((weekday) =>
        SEGMENTS.map((seg) => ({ barberId: user.id, weekday, ...seg })),
      ),
    });
  }

  const services = [
    { name: "Saç Kesimi", durationMin: 30, price: 40000, sortOrder: 1 },
    { name: "Sakal Tıraşı", durationMin: 20, price: 25000, sortOrder: 2 },
    { name: "Saç + Sakal", durationMin: 45, price: 60000, sortOrder: 3 },
    { name: "Çocuk Kesimi", durationMin: 25, price: 30000, sortOrder: 4 },
    { name: "Ustura Tıraş", durationMin: 30, price: 35000, sortOrder: 5 },
    { name: "Saç Yıkama", durationMin: 15, price: 15000, sortOrder: 6 },
  ];

  for (const s of services) {
    const exists = await db.service.findFirst({ where: { name: s.name } });
    if (exists) await db.service.update({ where: { id: exists.id }, data: s });
    else await db.service.create({ data: s });
  }

  const settings: Record<string, string> = {
    shopName: "Dükkân Berber",
    tagline: "Klasik ustura, modern kesim.",
    phone: "0555 000 00 00",
    address: "Merkez Mah. Ustura Sok. No: 1",
    instagram: "",
    mapsUrl: "",
    slotStep: "15",
    minLeadMin: "120",
    maxDays: "60",
  };
  for (const [key, value] of Object.entries(settings)) {
    await db.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  console.log("Seed tamam. Giriş: admin@berber.local / berber1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
