import { NextResponse } from "next/server";
import { buildMessage, sendIgText, markSeen } from "@/lib/ig";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req){
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN){
    return new Response(challenge || "", { status: 200 });
  }
  return new Response(null, { status: 403 });
}

export async function POST(req){
  try {
    const body = await req.json();
    if (body.object !== "instagram") return NextResponse.json({}, { status: 404 });

    const entries = Array.isArray(body.entry) ? body.entry : [];
    for (const entry of entries){
      const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
      for (const evt of messaging){
        const senderId = evt?.sender?.id;
        if (!senderId) continue;
        const reply = buildMessage();
        await sendIgText(senderId, reply);
        await markSeen(senderId);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("IG webhook error:", e);
    return NextResponse.json({ ok: true }); // 200 para evitar reintentos agresivos
  }
}