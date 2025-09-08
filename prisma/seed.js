import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function hasColumn(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    table, column
  );
  return Number(rows?.[0]?.cnt ?? 0) > 0;
}

async function main() {
  // ========= Items =========
  const pan = await prisma.item.upsert({
    where: { sku: "PAN" },
    update: {},
    create: { sku: "PAN", name: "Pan de papa", type: "INGREDIENT", reorderPoint: 20, unit: "un" }
  });

  const medallon = await prisma.item.upsert({
    where: { sku: "BEEF-100" },
    update: {},
    create: { sku: "BEEF-100", name: "Medallón 100g", type: "INGREDIENT", reorderPoint: 30, unit: "un" }
  });

  const cheddar = await prisma.item.upsert({
    where: { sku: "CHEDDAR-FETA" },
    update: {},
    create: { sku: "CHEDDAR-FETA", name: "Cheddar (feta)", type: "INGREDIENT", reorderPoint: 40, unit: "un" }
  });

  const cheeseSimple = await prisma.item.upsert({
    where: { sku: "BURGER-CHS-S" },
    update: {},
    create: {
      sku: "BURGER-CHS-S",
      name: "Cheeseburger Simple",
      type: "FINISHED",
      price: 3950,
      reorderPoint: 0,
      unit: "un",
      trackFinished: false
    }
  });

  // ========= BOM (limpio antes para evitar duplicados) =========
  await prisma.bom.deleteMany({ where: { productId: cheeseSimple.id } });
  await prisma.bom.createMany({
    data: [
      { productId: cheeseSimple.id, ingredientId: pan.id,      qtyPerUnit: 1 },
      { productId: cheeseSimple.id, ingredientId: medallon.id, qtyPerUnit: 1 },
      { productId: cheeseSimple.id, ingredientId: cheddar.id,  qtyPerUnit: 1 },
    ],
  });

  // ========= Stock (costos calibrados para que 1 unidad cueste 500; 2 unidades => COGS=1000) =========
  // PAN 100 + BEEF 350 + CHEDDAR 50 = 500 por unidad
  await prisma.stockBatch.deleteMany({ where: { itemId: { in: [pan.id, medallon.id, cheddar.id] } } });
  await prisma.stockBatch.createMany({
    data: [
      { itemId: pan.id,      qty: 10,  unitCost: 100 }, // < 20 → dispara low-stock
      { itemId: medallon.id, qty: 150, unitCost: 350 },
      { itemId: cheddar.id,  qty: 160, unitCost: 50  },
    ]
  });

  // ========= Admin opcional =========
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL },
      update: {},
      create: { email: process.env.ADMIN_EMAIL, passwordHash: hash, role: "ADMIN" }
    });
    console.log("Admin seed ✅", process.env.ADMIN_EMAIL);
  }

  // ========= Orden fija (id=10) para tests de webhook =========
  const qty = 2;
  const unitPrice = 3950;
  const subtotal = qty * unitPrice; // 7900
  const lineTotal = subtotal;

  const useGross     = await hasColumn('Order', 'gross');
  const useGrossProf = await hasColumn('Order', 'grossProfit');
  if (!useGross && !useGrossProf) {
    throw new Error("La tabla `Order` no tiene ni `gross` ni `grossProfit`.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: 10 } }).catch(() => {});
    await tx.order.delete({ where: { id: 10 } }).catch(() => {});

    await tx.order.create({
      data: {
        id: 10,
        status: "PENDING",
        subtotal,
        total: subtotal,
        cogs: 0,
        ...(useGross ? { gross: 0 } : { grossProfit: 0 }),
        items: {
          create: [{ itemId: cheeseSimple.id, qty, unitPrice, lineTotal }]
        }
      },
      include: { items: true }
    });
  });

  console.log("Seed listo ✅");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => prisma.$disconnect());