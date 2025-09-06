import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ error: "No hay items" }, { status: 400 });

    const discount = new Decimal(body.discount || 0);
    const taxRate = new Decimal(body.taxRate ?? process.env.TAX_RATE ?? 0);

    const skus = items.map(i => i.sku);
    const dbItems = await prisma.item.findMany({ where: { sku: { in: skus } } });
    const bySku = new Map(dbItems.map(i => [i.sku, i]));

    const lines = [];
    for (const row of items) {
      const it = bySku.get(row.sku);
      if (!it) return NextResponse.json({ error: `SKU inexistente: ${row.sku}` }, { status: 400 });
      const qty = parseInt(row.qty, 10) || 0;
      if (qty <= 0) return NextResponse.json({ error: `Cantidad inválida para ${row.sku}` }, { status: 400 });

      const unitPrice = new Decimal(row.price ?? it.price ?? 0);
      const lineTotal = unitPrice.times(qty);
      lines.push({ item: it, qty, unitPrice, lineTotal });
    }

    const subtotal = lines.reduce((acc, l) => acc.plus(l.lineTotal), new Decimal(0));
    const tax = subtotal.minus(discount).times(taxRate).toDecimalPlaces(2);
    const total = subtotal.minus(discount).plus(tax).toDecimalPlaces(2);

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({ data: {
        status: "PENDING",
        subtotal: subtotal.toNumber(),
        discount: discount.toNumber(),
        tax: tax.toNumber(),
        total: total.toNumber()
      }});

      for (const l of lines) {
        await tx.orderItem.create({ data: {
          orderId: created.id,
          itemId: l.item.id,
          qty: l.qty,
          unitPrice: l.unitPrice.toNumber(),
          lineTotal: l.lineTotal.toNumber()
        }});
      }
      return created;
    });

    return NextResponse.json({ ok: true, order });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Error" }, { status: 500 });
  }
}
