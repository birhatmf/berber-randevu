import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "./db";

const ROOT = process.env.MEDIA_DIR ?? join(process.cwd(), "storage", "media");

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function extFor(mime: string): string {
  return EXT[mime] ?? "bin";
}

export function mediaFilePath(media: { id: string; ext: string }): string {
  return join(ROOT, `${media.id}.${media.ext}`);
}

export function mediaUrl(media: { id: string; ext: string }): string {
  return `/api/media/${media.id}.${media.ext}`;
}

export function mediaIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/\/api\/media\/([^/?#.]+)/);
  return match ? match[1] : null;
}

export async function saveMedia(file: File) {
  const ext = extFor(file.type);
  await mkdir(ROOT, { recursive: true });

  const media = await db.media.create({ data: { mime: file.type, ext, size: file.size } });
  try {
    await writeFile(mediaFilePath(media), Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    await db.media.delete({ where: { id: media.id } }).catch(() => null);
    throw error;
  }
  return media;
}

export async function deleteMedia(id: string): Promise<void> {
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return;
  await unlink(mediaFilePath(media)).catch(() => null);
  await db.media.delete({ where: { id } }).catch(() => null);
}

export async function deleteMediaIfUnreferenced(id: string): Promise<void> {
  const needle = { contains: `/api/media/${id}` };
  const [settings, users, gallery] = await Promise.all([
    db.setting.count({ where: { value: needle } }),
    db.user.count({ where: { photo: needle } }),
    db.galleryImage.count({ where: { url: needle } }),
  ]);
  if (settings + users + gallery > 0) return;
  await deleteMedia(id);
}
