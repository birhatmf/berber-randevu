import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";
import { mediaFilePath } from "@/lib/media";

const CACHE = "public, max-age=31536000, immutable";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: raw } = await params;
  const id = raw.replace(/\.[^.]+$/, "");

  const media = await db.media.findUnique({ where: { id } });
  if (!media) return new Response("Bulunamadı.", { status: 404 });

  let file: Buffer;
  try {
    file = await readFile(mediaFilePath(media));
  } catch {
    return new Response("Bulunamadı.", { status: 404 });
  }

  const bytes = new Uint8Array(file);
  const headers = {
    "Content-Type": media.mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": CACHE,
  };

  // Safari <video> byte-range olmadan oynatmıyor; aralık isteklerini destekle.
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
      if (start <= end && start < bytes.length) {
        const slice = bytes.subarray(start, end + 1);
        return new Response(slice, {
          status: 206,
          headers: {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
            "Content-Length": String(slice.length),
          },
        });
      }
      return new Response(null, {
        status: 416,
        headers: { ...headers, "Content-Range": `bytes */${bytes.length}` },
      });
    }
  }

  return new Response(bytes, {
    headers: { ...headers, "Content-Length": String(bytes.length) },
  });
}
