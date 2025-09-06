import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const items = await prisma.item.findMany({
    where: { reorderPoint: { gt: 0 } },
    include: { batches: true }
  });

  const data = items.map(i => ({
    id: i.id,
    sku: i.sku,
    name: i.name,
    soh: i.batches.reduce((a, b) => a + Number(b.qty), 0),
    reorderPoint: i.reorderPoint
  })).filter(i => i.soh <= i.reorderPoint)
    .sort((a,b) => a.soh - b.soh);

  return NextResponse.json({ lowStock: data });
}
