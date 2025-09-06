import { NextResponse } from "next/server";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req){
  const body = await req.json();
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resp = await fetch(new URL('/api/orders', base), {
    method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body)
  });
  const j = await resp.json();
  if(!resp.ok) return NextResponse.json(j, { status: 400 });

  const testPaymentUrl = `/api/webhooks/payments?provider=test&status=approved&orderId=${j.order.id}`;
  return NextResponse.json({ ok:true, orderId: j.order.id, payment_url: testPaymentUrl });
}
