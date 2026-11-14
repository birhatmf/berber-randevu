"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createAppointment, createBlock, BookingError } from "@/lib/booking";
import { normalizePhone } from "@/lib/phone";
import { FIELDS } from "@/lib/settings";
import type { ActionState } from "./types";

const STATUSES = ["confirmed", "done", "no_show", "cancelled"] as const;

async function guard() {
  const session = await auth();
  if (!session?.user) throw new Error("Oturum bulunamadı.");
  return session.user;
}

function refresh(date?: string) {
  revalidatePath("/panel");
  revalidatePath("/panel/takvim");
  if (date) revalidatePath(`/panel?date=${date}`);
  revalidatePath("/");
}

export async function setAppointmentStatus(formData: FormData) {
  const user = await guard();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;

  const appointment = await db.appointment.findUnique({ where: { id } });
  if (!appointment) return;
  if (user.role !== "admin" && appointment.barberId !== user.id) return;

  await db.appointment.update({ where: { id }, data: { status } });
  refresh();
}

export async function deleteAppointment(formData: FormData) {
  const user = await guard();
  const id = String(formData.get("id") ?? "");
  const appointment = await db.appointment.findUnique({ where: { id } });
  if (!appointment) return;
  if (user.role !== "admin" && appointment.barberId !== user.id) return;

  await db.appointment.delete({ where: { id } });
  refresh();
}

const addSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Saat seçin."),
  name: z.string().trim().max(60).optional().default(""),
  phone: z.string().trim().max(25).optional().default(""),
  note: z.string().trim().max(200).optional().default(""),
});

export async function addAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await guard();
  const parsed = addSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Alanları kontrol edin." };

  const input = parsed.data;
  const [hh, mm] = input.time.split(":").map(Number);
  const startMin = hh * 60 + mm;
  if (user.role !== "admin" && input.barberId !== user.id) {
    return { error: "Başka berber adına randevu ekleyemezsiniz." };
  }

  const phone = input.phone ? normalizePhone(input.phone) : null;
  if (input.phone && !phone) return { error: "Telefon numarası geçersiz." };

  try {
    await createAppointment({
      barberId: input.barberId,
      serviceId: input.serviceId,
      date: input.date,
      startMin,
      customerName: input.name || "Walk-in",
      customerPhone: phone ?? "",
      source: phone ? "manual" : "walkin",
    });
    refresh(input.date);
    return { ok: true, message: "Randevu eklendi." };
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    return { error: "Randevu eklenemedi." };
  }
}

export async function addBlock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await guard();
  const barberId = String(formData.get("barberId") ?? "");
  if (user.role !== "admin" && barberId !== user.id) return { error: "Yetkiniz yok." };

  const date = String(formData.get("date") ?? "");
  const startMin = Number(formData.get("startMin") ?? 0);
  const duration = Math.min(240, Math.max(15, Number(formData.get("duration") ?? 30)));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Geçersiz tarih." };

  try {
    await createBlock({
      barberId,
      date,
      startMin,
      durationMin: duration,
      note: String(formData.get("note") ?? "Mola"),
    });
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    return { error: "Bloke eklenemedi." };
  }

  refresh(date);
  return { ok: true, message: "Bloke eklendi." };
}

// --- Admin ---

async function requireAdmin() {
  const user = await guard();
  if (user.role !== "admin") throw new Error("Yetkiniz yok.");
  return user;
}

const barberSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().trim().min(3, "Ad soyad girin."),
  email: z.string().trim().toLowerCase().email("Geçerli e-posta girin."),
  phone: z.string().trim().min(10, "Telefon girin."),
  title: z.string().trim().max(40).optional().default(""),
  bio: z.string().trim().max(240).optional().default(""),
  password: z.string().max(72).optional().default(""),
});

export async function saveBarber(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkiniz yok." };
  }

  const parsed = barberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const data = parsed.data;
  const phone = normalizePhone(data.phone);
  if (!phone) return { error: "Telefon numarası geçersiz." };
  if (!data.id && data.password.length < 6) return { error: "Başlangıç şifresi en az 6 karakter olmalı." };

  try {
    if (data.id) {
      await db.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          phone,
          title: data.title || null,
          bio: data.bio || null,
          ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 10) } : {}),
        },
      });
    } else {
      await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone,
          title: data.title || null,
          bio: data.bio || null,
          role: "barber",
          passwordHash: await bcrypt.hash(data.password || "berber1234", 10),
        },
      });
    }
  } catch {
    return { error: "Bu e-posta veya telefon zaten kayıtlı." };
  }

  revalidatePath("/panel/berberler");
  return { ok: true, message: "Kaydedildi." };
}

export async function toggleBarber(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const barber = await db.user.findUnique({ where: { id } });
  if (!barber || barber.role === "admin") return;
  await db.user.update({ where: { id }, data: { active: !barber.active } });
  revalidatePath("/panel/berberler");
}

const serviceSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().trim().min(2, "Hizmet adı girin."),
  durationMin: z.coerce.number().int().min(5).max(480),
  priceTl: z.coerce.number().min(0).max(100000),
  sortOrder: z.coerce.number().int().min(0).max(999).optional().default(0),
});

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkiniz yok." };
  }

  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const { id, priceTl, ...rest } = parsed.data;
  const data = { ...rest, price: Math.round(priceTl * 100) };
  if (id) await db.service.update({ where: { id }, data });
  else await db.service.create({ data });

  revalidatePath("/panel/hizmetler");
  revalidatePath("/");
  revalidatePath("/randevu");
  return { ok: true, message: "Kaydedildi." };
}

export async function toggleService(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const service = await db.service.findUnique({ where: { id } });
  if (!service) return;
  await db.service.update({ where: { id }, data: { active: !service.active } });
  revalidatePath("/panel/hizmetler");
  revalidatePath("/");
  revalidatePath("/randevu");
}

const toMinutes = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

type ParsedSegment = { weekday: number; startMin: number; endMin: number };

function parseHours(formData: FormData): ParsedSegment[] | null {
  const rows: ParsedSegment[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    if (formData.get(`w-${weekday}-on`) !== "on") continue;
    const start = toMinutes(String(formData.get(`w-${weekday}-start`) ?? ""));
    const end = toMinutes(String(formData.get(`w-${weekday}-end`) ?? ""));
    if (start === null || end === null || start >= end) return null;

    const breakStart = toMinutes(String(formData.get(`w-${weekday}-breakStart`) ?? ""));
    const breakEnd = toMinutes(String(formData.get(`w-${weekday}-breakEnd`) ?? ""));

    if (breakStart !== null && breakEnd !== null && breakStart < breakEnd) {
      if (breakStart > start) rows.push({ weekday, startMin: start, endMin: breakStart });
      if (breakEnd < end) rows.push({ weekday, startMin: breakEnd, endMin: end });
    } else {
      rows.push({ weekday, startMin: start, endMin: end });
    }
  }

  return rows;
}

export async function saveWorkHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let user;
  try {
    user = await guard();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const barberId = String(formData.get("barberId") ?? "");
  if (user.role !== "admin" && barberId !== user.id) return { error: "Yetkiniz yok." };

  const parsed = parseHours(formData);
  if (parsed === null) return { error: "Çalışma saatleri geçersiz." };

  await db.workHours.deleteMany({ where: { barberId } });
  if (parsed.length) {
    await db.workHours.createMany({ data: parsed.map((row) => ({ barberId, ...row })) });
  }

  revalidatePath("/panel/berberler");
  revalidatePath("/panel/ayarlar");
  revalidatePath("/randevu");
  return { ok: true, message: "Çalışma saatleri güncellendi." };
}

export async function saveShopWorkHours(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkiniz yok." };
  }

  const parsed = parseHours(formData);
  if (parsed === null) return { error: "Çalışma saatleri geçersiz." };
  if (parsed.length === 0) return { error: "En az bir gün açık olmalı." };

  const barbers = await db.user.findMany({
    where: { role: "barber", active: true },
    select: { id: true },
  });
  if (barbers.length === 0) return { error: "Aktif berber yok." };

  await db.$transaction([
    db.workHours.deleteMany({ where: { barberId: { in: barbers.map((b) => b.id) } } }),
    db.workHours.createMany({
      data: barbers.flatMap((barber) => parsed.map((row) => ({ barberId: barber.id, ...row }))),
    }),
  ]);

  revalidatePath("/panel/berberler");
  revalidatePath("/panel/ayarlar");
  revalidatePath("/randevu");
  return { ok: true, message: `${barbers.length} berberin çalışma saatleri güncellendi.` };
}

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkiniz yok." };
  }

  for (const field of FIELDS) {
    if (field.type === "image" || !formData.has(field.key)) continue;
    const value = String(formData.get(field.key) ?? "").trim();
    await db.setting.upsert({
      where: { key: field.key },
      update: { value },
      create: { key: field.key, value },
    });
  }

  revalidatePath("/");
  revalidatePath("/panel/ayarlar");
  revalidatePath("/panel/site");
  return { ok: true, message: "Kaydedildi." };
}

const passwordSchema = z
  .object({
    current: z.string().min(1, "Mevcut şifreyi girin."),
    next: z.string().min(8, "Yeni şifre en az 8 karakter olmalı.").max(72),
    confirm: z.string().min(1, "Yeni şifreyi tekrar girin."),
  })
  .refine((data) => data.next === data.confirm, {
    message: "Yeni şifreler eşleşmiyor.",
    path: ["confirm"],
  });

export async function changeOwnPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let user;
  try {
    user = await guard();
  } catch {
    return { error: "Oturum bulunamadı." };
  }

  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Alanları kontrol edin." };
  }

  const account = await db.user.findUnique({ where: { id: user.id } });
  if (!account) return { error: "Kullanıcı bulunamadı." };

  const valid = await bcrypt.compare(parsed.data.current, account.passwordHash);
  if (!valid) return { error: "Mevcut şifre hatalı." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.next, 10) },
  });

  return { ok: true, message: "Şifreniz güncellendi." };
}
