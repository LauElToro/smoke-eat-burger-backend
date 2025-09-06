import { GET as lowStock } from '@/app/api/inventory/low-stock/route';

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    item: {
      findMany: async () => ([
        { id:1, sku:'PAN', name:'Pan', reorderPoint: 20, batches:[{qty: 10}] },
        { id:2, sku:'CARNE', name:'Carne', reorderPoint: 30, batches:[{qty: 31}] }
      ])
    }
  }
}));

test('low stock lista items por debajo del punto de reposición', async () => {
  const res = await lowStock();
  const json = await res.json();
  expect(json.lowStock.length).toBe(1);
  expect(json.lowStock[0].sku).toBe('PAN');
});
