import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lista items por debajo de su reorderPoint
export async function GET() {
  try {
    const items = await prisma.item.findMany({
      where: { type: "INGREDIENT" },
      select: { id: true, sku: true, name: true, reorderPoint: true },
      orderBy: { sku: "asc" },
    });

    // Stock on hand (SOH) por item
    const batches = await prisma.stockBatch.groupBy({
      by: ["itemId"],
      _sum: { qty: true },
      where: { itemId: { in: items.map((i) => i.id) } },
    });
    const soh = new Map(batches.map((b) => [b.itemId, Number(b._sum.qty || 0)]));

    const lowStock = items
      .map((i) => ({
        id: i.id,
        sku: i.sku,
        name: i.name,
        reorderPoint: i.reorderPoint,
        qty: soh.get(i.id) || 0,
      }))
      .filter((i) => i.qty < i.reorderPoint)
      .sort((a, b) => a.sku.localeCompare(b.sku));

    return NextResponse.json({ lowStock });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
