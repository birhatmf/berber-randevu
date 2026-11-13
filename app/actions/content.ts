"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { MEDIA_KEYS, VIDEO_KEYS, isSettingKey, type SettingKey } from "@/lib/settings";
import type { ActionState } from "./types";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;
const IMAGE_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];
const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];

function validateMedia(key: SettingKey, file: File): string | null {
  if (VIDEO_KEYS.includes(key)) {
    if (!VIDEO_MIME.includes(file.type)) return "MP4 veya WEBM video yükleyin.";
    if (file.size > MAX_VIDEO_BYTES) return "Video en fazla 20 MB olabilir.";
    return null;
  }
  if (!IMAGE_MIME.includes(file.type)) return "PNG, JPG, WEBP, GIF veya AVIF yükleyin.";
  if (file.size > MAX_IMAGE_BYTES) return "En fazla 4 MB görsel yükleyebilirsiniz.";
  return null;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session.user;
}

export async function updateContent(key: string, value: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };
  if (!isSettingKey(key)) return { error: "Bilinmeyen alan." };
  if (value.length > 600) return { error: "Metin çok uzun." };
  if (MEDIA_KEYS.includes(key as SettingKey)) return { error: "Görseller yükleme ile değiştirilir." };

  await db.setting.upsert({
    where: { key },
    update: { value: value.trim() },
    create: { key, value: value.trim() },
  });

  revalidatePath("/");
  revalidatePath("/panel/site");
  return { ok: true, message: "Kaydedildi." };
}

export async function uploadSettingImage(key: string, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };
  if (!MEDIA_KEYS.includes(key as SettingKey)) return { error: "Geçersiz medya alanı." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Dosya seçilmedi." };
  const invalid = validateMedia(key as SettingKey, file);
  if (invalid) return { error: invalid };

  const media = await db.media.create({
    data: { mime: file.type, bytes: Buffer.from(await file.arrayBuffer()) },
  });
  const url = `/api/media/${media.id}`;

  await db.setting.upsert({
    where: { key },
    update: { value: url },
    create: { key, value: url },
  });

  revalidatePath("/");
  revalidatePath("/panel/site");
  return { ok: true, message: "Medya yüklendi.", url };
}

export async function uploadBarberPhoto(formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const barberId = String(formData.get("barberId") ?? "");
  const file = formData.get("file");
  if (!barberId) return { error: "Önce berberi kaydedin." };
  if (!(file instanceof File) || file.size === 0) return { error: "Dosya seçilmedi." };
  if (!IMAGE_MIME.includes(file.type)) {
    return { error: "PNG, JPG, WEBP, GIF veya AVIF yükleyin." };
  }
  if (file.size > MAX_IMAGE_BYTES) return { error: "En fazla 4 MB görsel yükleyebilirsiniz." };

  const barber = await db.user.findUnique({ where: { id: barberId } });
  if (!barber || barber.role !== "barber") return { error: "Berber bulunamadı." };

  const media = await db.media.create({
    data: { mime: file.type, bytes: Buffer.from(await file.arrayBuffer()) },
  });

  await db.user.update({ where: { id: barberId }, data: { photo: `/api/media/${media.id}` } });

  revalidatePath("/");
  revalidatePath("/panel/berberler");
  return { ok: true, message: "Fotoğraf yüklendi.", url: `/api/media/${media.id}` };
}

export async function clearBarberPhoto(barberId: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  await db.user.update({ where: { id: barberId }, data: { photo: null } });
  revalidatePath("/");
  revalidatePath("/panel/berberler");
  return { ok: true, message: "Fotoğraf kaldırıldı." };
}

export async function clearSettingImage(key: string): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };
  if (!MEDIA_KEYS.includes(key as SettingKey)) return { error: "Geçersiz medya alanı." };

  await db.setting.upsert({ where: { key }, update: { value: "" }, create: { key, value: "" } });
  revalidatePath("/");
  revalidatePath("/panel/site");
  return { ok: true, message: "Kaldırıldı." };
}

// --- Galeri ---

export async function addGalleryImages(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAdmin();
  if (!user) return { error: "Yetkiniz yok." };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Fotoğraf seçilmedi." };
  if (files.length > 12) return { error: "Tek seferde en fazla 12 fotoğraf yükleyin." };

  for (const file of files) {
    if (!IMAGE_MIME.includes(file.type)) return { error: `${file.name}: desteklenmeyen format.` };
    if (file.size > MAX_IMAGE_BYTES) return { error: `${file.name}: 4 MB sınırı aşıldı.` };
  }

  const count = await db.galleryImage.count();
  if (count + files.length > 80) return { error: "Galeri doldu (en fazla 80 fotoğraf)." };

  for (const [index, file] of files.entries()) {
    const media = await db.media.create({
      data: { mime: file.type, bytes: Buffer.from(await file.arrayBuffer()) },
    });
    await db.galleryImage.create({
      data: {
        url: `/api/media/${media.id}`,
        alt: file.name.replace(/\.[^.]+$/, ""),
        sortOrder: count + index,
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/panel/galeri");
  return { ok: true, message: `${files.length} fotoğraf eklendi.` };
}

export async function deleteGalleryImage(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db.galleryImage.delete({ where: { id } }).catch(() => null);
  revalidatePath("/");
  revalidatePath("/panel/galeri");
}

export async function moveGalleryImage(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  if (!user) return;

  const id = String(formData.get("id") ?? "");
  const direction = formData.get("direction") === "up" ? -1 : 1;

  const images = await db.galleryImage.findMany({ orderBy: { sortOrder: "asc" } });
  const index = images.findIndex((image) => image.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= images.length) return;

  await db.$transaction([
    db.galleryImage.update({ where: { id: images[index].id }, data: { sortOrder: target } }),
    db.galleryImage.update({ where: { id: images[target].id }, data: { sortOrder: index } }),
  ]);

  revalidatePath("/");
  revalidatePath("/panel/galeri");
}
