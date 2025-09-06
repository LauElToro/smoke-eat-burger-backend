import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { explodeBOM, consumeForOrder } from "@/lib/inventory";
import Decimal from "decimal.js";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req){
  const url = new URL(req.url);
  return handlePayment({
    provider: url.searchParams.get('provider'),
    status: url.searchParams.get('status'),
    orderId: Number(url.searchParams.get('orderId')),
    ref: url.searchParams.get('ref')
  });
}

export async function POST(req){
  const body = await req.json();
  return handlePayment(body);
}

async function handlePayment({ provider = 'unknown', status, orderId, ref }){
  try {
    if (!orderId) return NextResponse.json({ error: 'orderId requerido' }, { status: 400 });
    if (!status) return NextResponse.json({ error: 'status requerido' }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { item: true } } }
    });
    if (!order) return NextResponse.json({ error: 'Orden no existe' }, { status: 404 });

    if (status !== 'approved' && status !== 'paid'){
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELED', paymentProvider: provider, paymentRef: ref || null }
      });
      return NextResponse.json({ ok: true, canceled: true });
    }

    if (order.status === 'PAID') return NextResponse.json({ ok: true, already: true });

    const consumptions = [];
    for (const l of order.items) {
      if (l.item.type === 'FINISHED' && l.item.trackFinished) {
        consumptions.push({ itemId: l.itemId, qty: l.qty });
      } else if (l.item.type === 'FINISHED') {
        const ing = await explodeBOM(l.itemId, l.qty);
        consumptions.push(...ing);
      } else {
        consumptions.push({ itemId: l.itemId, qty: l.qty });
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const cogs = await consumeForOrder(tx, order.id, consumptions);
      const gross = new Decimal(order.subtotal).minus(order.discount).minus(cogs).toDecimalPlaces(2);
      return tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paymentProvider: provider,
          paymentRef: ref || null,
          cogs: cogs.toNumber(),
          grossProfit: gross.toNumber()
        }
      });
    });

    return NextResponse.json({ ok: true, order: saved });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Error' }, { status: 500 });
  }
}
