import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function hasColumn(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table, column
  );
  return Number(rows?.[0]?.cnt ?? 0) > 0;
}

function num(x) { return x == null ? x : Number(x); }
function normalizeOrder(o) {
  if (!o) return o;
  return {
    ...o,
    subtotal: num(o.subtotal),
    total:    num(o.total),
    cogs:     num(o.cogs),
    gross:        o.gross        != null ? num(o.gross)        : undefined,
    grossProfit:  o.grossProfit  != null ? num(o.grossProfit)  : undefined,
    items: o.items?.map(i => ({
      ...i,
      qty:       num(i.qty),
      unitPrice: num(i.unitPrice),
      lineTotal: num(i.lineTotal),
    })),
  };
}

async function resolveItems(body) {
  // Formatos aceptados:
  // 1) { items: [{ itemId?, sku?, qty, unitPrice? }, ...] }
  // 2) { sku, qty } (atajo de 1 ítem)
  let raw = [];
  if (Array.isArray(body?.items) && body.items.length) raw = body.items;
  else if (body?.sku) raw = [{ sku: body.sku, qty: body.qty ?? 1 }];

  if (!raw.length) return [];

  const resolved = [];
  for (const it of raw) {
    let itemRecord = null;
    if (it.itemId) {
      itemRecord = await prisma.item.findUnique({ where: { id: Number(it.itemId) } });
    } else if (it.sku) {
      itemRecord = await prisma.item.findUnique({ where: { sku: String(it.sku) } });
    }
    if (!itemRecord) throw new Error("Item not found");

    const qty = Number(it.qty ?? 1);
    const unitPrice = it.unitPrice != null ? Number(it.unitPrice) : Number(itemRecord.price ?? 0);
    if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) throw new Error("Bad numbers");

    resolved.push({
      itemId: itemRecord.id,
      qty,
      unitPrice,
      lineTotal: qty * unitPrice,
    });
  }
  return resolved;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const items = await resolveItems(body);
    if (!items.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    const subtotal = items.reduce((acc, it) => acc + it.lineTotal, 0);
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return NextResponse.json({ error: "Invalid totals" }, { status: 400 });
    }

    const useGross = await hasColumn("Order", "gross");
    const grossKey = useGross ? "gross" : "grossProfit";

    const order = await prisma.order.create({
      data: {
        status: "PENDING",
        subtotal,
        total: subtotal,
        cogs: 0,
        [grossKey]: 0,
        items: { create: items },
      },
      include: { items: true },
    });

    return NextResponse.json({ order: normalizeOrder(order) }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}