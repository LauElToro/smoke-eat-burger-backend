import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consumeForOrder } from "@/lib/inventory";

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

// Fallback robusto: agrupa BOM por ingrediente para evitar duplicados
async function computeCogsFromBOM(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return 0;

  let total = 0;

  for (const oi of order.items) {
    // Agrupo por ingrediente y sumo qtyPerUnit (por si hubiera más de una fila)
    const grouped = await prisma.bom.groupBy({
      by: ["ingredientId", "productId"],
      where: { productId: oi.itemId },
      _sum: { qtyPerUnit: true }
    });

    for (const row of grouped) {
      const batch = await prisma.stockBatch.findFirst({
        where: { itemId: row.ingredientId },
        orderBy: { id: "asc" },
      });
      const unitCost = Number(batch?.unitCost ?? 0);
      const qtyPerUnit = Number(row?._sum?.qtyPerUnit ?? 0);
      total += oi.qty * qtyPerUnit * unitCost;
    }
  }
  return total;
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const orderId = Number(url.searchParams.get("orderId"));

    if (!orderId || status !== "approved") {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 1) Intento usar consumeForOrder (mock/real). Si falla, fallback por BOM.
    let cogs = 0;
    try {
      const r = await consumeForOrder(orderId);
      if (typeof r === "number") cogs = r;
      else if (r && typeof r.cogs !== "undefined") cogs = Number(r.cogs);
      else throw new Error("Bad consumeForOrder result");
      if (!Number.isFinite(cogs)) throw new Error("NaN cogs");
    } catch {
      cogs = await computeCogsFromBOM(orderId);
    }

    const subtotal = Number(order.subtotal);
    const grossValue = subtotal - cogs;

    const useGross = await hasColumn("Order", "gross");
    const data = {
      status: "PAID",
      cogs,
      ...(useGross ? { gross: grossValue } : { grossProfit: grossValue }),
    };

    const updated = await prisma.order.update({
      where: { id: orderId },
      data,
      include: { items: true },
    });

    return NextResponse.json({ order: normalizeOrder(updated) }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}