import { NextResponse } from "next/server";
import { getWhatsAppConfig } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Meta webhook doğrulaması
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const { verifyToken } = await getWhatsAppConfig();
  if (mode === "subscribe" && token && verifyToken && token === verifyToken) {
    return new Response(challenge ?? "ok");
  }
  return NextResponse.json({ error: "Doğrulama başarısız." }, { status: 403 });
}

// Teslimat durumları. MVP'de kalıcı kayıt tutulmuyor; sadece loglanır.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const statuses = body?.entry?.[0]?.changes?.[0]?.value?.statuses;
    if (Array.isArray(statuses)) {
      for (const status of statuses) {
        console.log(`[whatsapp:webhook] ${status.id} -> ${status.status}`);
      }
    }
  } catch {
    // yut, Meta tekrar denemesin
  }
  return NextResponse.json({ ok: true });
}
