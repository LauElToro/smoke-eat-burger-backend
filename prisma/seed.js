// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // =============== Items (Ingredientes) ===============
  const pan = await prisma.item.upsert({
    where: { sku: "PAN-PAPA" },
    update: { name: "Pan de papa", type: "INGREDIENT", reorderPoint: 20, unit: "un" },
    create: { sku: "PAN-PAPA", name: "Pan de papa", type: "INGREDIENT", reorderPoint: 20, unit: "un" }
  });

  const medallon = await prisma.item.upsert({
    where: { sku: "BEEF-100" },
    update: { name: "Medallón 100g", type: "INGREDIENT", reorderPoint: 30, unit: "un" },
    create: { sku: "BEEF-100", name: "Medallón 100g", type: "INGREDIENT", reorderPoint: 30, unit: "un" }
  });

  const cheddar = await prisma.item.upsert({
    where: { sku: "CHEDDAR-FETA" },
    update: { name: "Cheddar (feta)", type: "INGREDIENT", reorderPoint: 40, unit: "un" },
    create: { sku: "CHEDDAR-FETA", name: "Cheddar (feta)", type: "INGREDIENT", reorderPoint: 40, unit: "un" }
  });

  // =============== Items (Productos Terminados) ===============
  const cheeseSimple = await prisma.item.upsert({
    where: { sku: "BURGER-CHS-S" },
    update: { name: "Cheeseburger Simple", type: "FINISHED", price: 3950, reorderPoint: 0, unit: "un", trackFinished: false },
    create: { sku: "BURGER-CHS-S", name: "Cheeseburger Simple", type: "FINISHED", price: 3950, reorderPoint: 0, unit: "un", trackFinished: false }
  });

  // Producto para probar low-stock en tests (1 resultado esperado)
  await prisma.item.upsert({
    where: { sku: "FRIES-S" },
    update: { name: "Papas Chicas", type: "FINISHED", price: 1500, reorderPoint: 10, unit: "un", trackFinished: false },
    create: { sku: "FRIES-S", name: "Papas Chicas", type: "FINISHED", price: 1500, reorderPoint: 10, unit: "un", trackFinished: false }
  });

  // =============== BOM (Receta de Cheeseburger) ===============
  await prisma.bom.createMany({
    data: [
      { productId: cheeseSimple.id, ingredientId: pan.id,      qtyPerUnit: 1 },
      { productId: cheeseSimple.id, ingredientId: medallon.id, qtyPerUnit: 1 },
      { productId: cheeseSimple.id, ingredientId: cheddar.id,  qtyPerUnit: 1 },
    ],
    skipDuplicates: true
  });

  // =============== Stock inicial (Batches con costo) ===============
  // Ingredientes con stock cómodo
  const existingBatches = await prisma.stockBatch.count({
    where: { itemId: { in: [pan.id, medallon.id, cheddar.id] } }
  });
  if (existingBatches === 0) {
    await prisma.stockBatch.createMany({
      data: [
        { itemId: pan.id,      qty: 160, unitCost: 120, note: "seed" },
        { itemId: medallon.id, qty: 150, unitCost: 340, note: "seed" },
        { itemId: cheddar.id,  qty: 162, unitCost: 90,  note: "seed" },
      ],
      skipDuplicates: true
    });
  }

  // FRIES-S con stock bajo para que /inventory/low-stock retorne 1 elemento
  const fries = await prisma.item.findUnique({ where: { sku: "FRIES-S" } });
  const friesBatches = await prisma.stockBatch.count({ where: { itemId: fries.id } });
  if (friesBatches === 0) {
    await prisma.stockBatch.create({
      data: { itemId: fries.id, qty: 3, unitCost: 500, note: "seed-low" } // soh=3 <= reorderPoint=10
    });
  }

  // =============== Usuario admin opcional (por env) ===============
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: process.env.ADMIN_EMAIL },
      update: { role: "ADMIN" },
      create: { email: process.env.ADMIN_EMAIL, passwordHash: hash, role: "ADMIN" }
    });
    console.log("Admin seed ✅", process.env.ADMIN_EMAIL);
  }

  console.log("Seed listo ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
