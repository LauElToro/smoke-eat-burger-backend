import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // 1) Limpiar datos en orden (evita FK conflicts)
  await prisma.orderLine?.deleteMany?.().catch(() => {});
  await prisma.order?.deleteMany?.().catch(() => {});
  await prisma.stockBatch.deleteMany();
  await prisma.bom.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  // 2) Items (skus alineados a tests)
  const pan = await prisma.item.create({
    data: { sku: "PAN", name: "Pan", type: "INGREDIENT", reorderPoint: 200, unit: "un" }
  });
  const medallon = await prisma.item.create({
    data: { sku: "BEEF-100", name: "Medallón 100g", type: "INGREDIENT", reorderPoint: 30, unit: "un" }
  });
  const cheddar = await prisma.item.create({
    data: { sku: "CHEDDAR", name: "Cheddar (feta)", type: "INGREDIENT", reorderPoint: 40, unit: "un" }
  });

  // 3) Producto terminado
  const cheeseSimple = await prisma.item.create({
    data: { sku: "BURGER-CHS-S", name: "Cheeseburger Simple", type: "FINISHED", price: 3950, reorderPoint: 0, unit: "un", trackFinished: false }
  });

  // 4) BOM
  await prisma.bom.createMany({
    data: [
      { productId: cheeseSimple.id, ingredientId: pan.id, qtyPerUnit: 1 },
      { productId: cheeseSimple.id, ingredientId: medallon.id, qtyPerUnit: 1 },
      { productId: cheeseSimple.id, ingredientId: cheddar.id, qtyPerUnit: 1 },
    ],
    skipDuplicates: true
  });

  // 5) Stock inicial — sólo PAN está por debajo del ROP (200)
  await prisma.stockBatch.createMany({
    data: [
      { itemId: pan.id, qty: 160, unitCost: 120 },   // < 200  => low-stock
      { itemId: medallon.id, qty: 150, unitCost: 340 }, // > 30
      { itemId: cheddar.id, qty: 162, unitCost: 90 },   // > 40
    ]
  });

  // 6) Admin opcional
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: { email: process.env.ADMIN_EMAIL, passwordHash: hash, role: "ADMIN" }
    });
    console.log("Admin seed ✅", process.env.ADMIN_EMAIL);
  }

  console.log("Seed listo ✅");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
