"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { availableSlots, createAppointment, BookingError } from "@/lib/booking";
import { normalizePhone } from "@/lib/phone";
import { signPhone, verifyPhoneProof } from "@/lib/proof";
import { dateTimeOf, timeOf } from "@/lib/time";
import { sendOtp } from "@/lib/whatsapp";
import { notifyCancelled, notifyNewAppointment } from "@/lib/notify";
import type { ActionState } from "./types";

const PROOF_COOKIE = "randevu_proof";
const OTP_PHONE_COOKIE = "otp_phone";

const bookSchema = z.object({
  serviceId: z.string().min(1),
  barberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startMin: z.coerce.number().int().min(0).max(1439),
  name: z.string().trim().min(3, "İsim ve soyisim girin.").max(60),
  phone: z.string().trim().min(10, "Geçerli bir telefon girin.").max(25),
});

export async function bookAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = bookSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };
  }
  const input = parsed.data;
  const phone = normalizePhone(input.phone);
  if (!phone) return { error: "Telefon numarası geçersiz. Örnek: 0532 123 45 67" };

  try {
    const slots = await availableSlots(input.barberId, input.date, input.serviceId);
    if (!slots.includes(input.startMin)) {
      return { error: "Seçtiğiniz saat artık uygun değil. Lütfen başka bir saat seçin." };
    }

    const appointment = await createAppointment({
      barberId: input.barberId,
      serviceId: input.serviceId,
      date: input.date,
      startMin: input.startMin,
      customerName: input.name,
      customerPhone: phone,
      status: "pending",
      source: "online",
    });

    const detail = await db.appointment.findUnique({
      where: { id: appointment.id },
      include: { service: true, barber: { select: { name: true } } },
    });

    await notifyNewAppointment({
      id: appointment.id,
      barberId: appointment.barberId,
      barberName: detail?.barber.name ?? "",
      customerName: input.name,
      customerPhone: phone,
      serviceName: detail?.service?.name ?? null,
      durationMin: detail?.service?.durationMin ?? null,
      start: appointment.start,
      source: "online",
      status: appointment.status,
    });

    revalidatePath("/panel");
    revalidatePath("/panel/takvim");

    return {
      ok: true,
      appointment: {
        id: appointment.id,
        barber: detail?.barber.name ?? "",
        service: detail?.service?.name ?? "",
        dateText: dateTimeOf(appointment.start),
        endText: timeOf(appointment.end),
        name: input.name,
        phone,
      },
    };
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message };
    return { error: "Randevu oluşturulamadı. Lütfen tekrar deneyin." };
  }
}

async function currentProof(): Promise<{ phone: string; proof: string } | null> {
  const raw = (await cookies()).get(PROOF_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { phone?: string; proof?: string };
    if (!parsed.phone || !parsed.proof) return null;
    if (!verifyPhoneProof(parsed.phone, parsed.proof)) return null;
    return { phone: parsed.phone, proof: parsed.proof };
  } catch {
    return null;
  }
}

export async function requestOtp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const rawPhone = String(formData.get("phone") ?? "");
  const phone = normalizePhone(rawPhone);

  if (name.length < 3) return { error: "İsim ve soyisim girin." };
  if (!phone) return { error: "Telefon numarası geçersiz. Örnek: 0532 123 45 67" };

  const since = new Date(Date.now() - 10 * 60 * 1000);
  const recent = await db.otp.count({ where: { phone, createdAt: { gt: since } } });
  if (recent >= 3) {
    return { error: "Çok fazla kod istediniz. 10 dakika sonra tekrar deneyin." };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  await db.otp.create({
    data: { phone, code, purpose: "query", expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  const sent = await sendOtp(phone, code);
  if (!sent.ok && !sent.dryRun) {
    return { error: "Kod gönderilemedi. Lütfen dükkânı arayın." };
  }

  const jar = await cookies();
  jar.set(OTP_PHONE_COOKIE, phone, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return {
    ok: true,
    message: "Doğrulama kodu gönderildi.",
    devCode: sent.dryRun ? code : undefined,
  };
}

export async function verifyOtp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  const phone = (await cookies()).get(OTP_PHONE_COOKIE)?.value;

  if (!phone) return { error: "Kod isteği bulunamadı. Baştan başlayın." };
  if (code.length !== 6) return { error: "6 haneli kodu girin." };

  const otp = await db.otp.findFirst({
    where: { phone, purpose: "query" },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { error: "Kod bulunamadı. Yeni kod isteyin." };
  if (otp.expiresAt < new Date()) return { error: "Kodun süresi doldu. Yeni kod isteyin." };
  if (otp.attempts >= 5) return { error: "Çok fazla deneme. Yeni kod isteyin." };

  if (otp.code !== code) {
    await db.otp.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { error: "Kod hatalı." };
  }

  await db.otp.deleteMany({ where: { phone, purpose: "query" } });
  const jar = await cookies();
  jar.delete(OTP_PHONE_COOKIE);
  jar.set(PROOF_COOKIE, JSON.stringify({ phone, proof: signPhone(phone) }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  });

  return { ok: true, message: "Doğrulandı." };
}

export async function customerAppointments() {
  const proof = await currentProof();
  if (!proof) return null;
  return db.appointment.findMany({
    where: {
      customerPhone: proof.phone,
      status: { not: "cancelled" },
      start: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
    orderBy: { start: "asc" },
    include: { service: true, barber: { select: { name: true, title: true } } },
  });
}

export async function customerProfile() {
  const proof = await currentProof();
  return proof?.phone ?? null;
}

export async function cancelOwnAppointment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const proof = await currentProof();
  if (!proof) return { error: "Oturum süresi doldu. Tekrar doğrulayın." };

  const appointment = await db.appointment.findUnique({ where: { id } });
  if (!appointment || appointment.customerPhone !== proof.phone) {
    return { error: "Randevu bulunamadı." };
  }
  if (appointment.start < new Date()) {
    return { error: "Geçmiş randevu iptal edilemez." };
  }

  const detail = await db.appointment.findUnique({
    where: { id },
    include: { barber: { select: { name: true } } },
  });

  await db.appointment.update({ where: { id }, data: { status: "cancelled" } });

  if (detail) {
    await notifyCancelled({
      customerPhone: detail.customerPhone,
      barberName: detail.barber.name,
      start: detail.start,
    });
  }

  revalidatePath("/randevum");
  revalidatePath("/panel");
  revalidatePath("/panel/takvim");
  return { ok: true, message: "Randevunuz iptal edildi." };
}

export async function signOutCustomer() {
  (await cookies()).delete(PROOF_COOKIE);
  revalidatePath("/randevum");
}

