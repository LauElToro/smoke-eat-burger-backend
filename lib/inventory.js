import { prisma } from "./prisma.js";
import Decimal from "decimal.js";

export async function getSOH(itemId) {
  const agg = await prisma.stockBatch.aggregate({
    _sum: { qty: true },
    where: { itemId }
  });
  return new Decimal(agg._sum.qty || 0);
}

async function allocateFIFO(tx, itemId, requiredQty) {
  let remaining = new Decimal(requiredQty);
  let cogs = new Decimal(0);
  const allocations = [];

  const batches = await tx.stockBatch.findMany({
    where: { itemId, qty: { gt: 0 } },
    orderBy: { createdAt: "asc" }
  });

  for (const b of batches) {
    if (remaining.lte(0)) break;
    const take = Decimal.min(new Decimal(b.qty), remaining);
    await tx.stockBatch.update({
      where: { id: b.id },
      data: { qty: new Decimal(b.qty).minus(take).toDecimalPlaces(3).toNumber() }
    });
    cogs = cogs.plus(new Decimal(b.unitCost).times(take));
    allocations.push({ batchId: b.id, qty: take, unitCost: new Decimal(b.unitCost) });
    remaining = remaining.minus(take);
  }

  if (remaining.gt(0)) {
    throw new Error(`Stock insuficiente para item ${itemId}: faltan ${remaining.toString()}`);
  }

  return { cogs, allocations };
}

export async function explodeBOM(productId, qty) {
  const boms = await prisma.bom.findMany({ where: { productId } });
  return boms.map(b => ({ itemId: b.ingredientId, qty: new Decimal(b.qtyPerUnit).times(qty) }));
}

export async function consumeForOrder(tx, orderId, lines) {
  let totalCOGS = new Decimal(0);
  const need = new Map();
  for (const l of lines) {
    const key = l.itemId;
    const q = new Decimal(l.qty);
    need.set(key, (need.get(key) || new Decimal(0)).plus(q));
  }

  for (const [itemId, qty] of need.entries()) {
    const { cogs, allocations } = await allocateFIFO(tx, itemId, qty);
    totalCOGS = totalCOGS.plus(cogs);
    for (const a of allocations) {
      await tx.stockMovement.create({ data: {
        itemId,
        type: "OUT",
        qty: a.qty.toNumber(),
        unitCost: a.unitCost.toNumber(),
        orderId,
        stockBatchId: a.batchId,
        note: "Venta"
      }});
    }
  }
  return totalCOGS;
}

// export internals for testing if needed
export const _internals = { allocateFIFO };
