import { POST as createOrder } from '@/app/api/orders/route';

// mock prisma
vi.mock('../../lib/prisma.js', () => {
  const items = [
    { id: 1, sku: 'BURGER-CHS-S', price: 3950, type: 'FINISHED' }
  ];
  return {
    prisma: {
      item: { findMany: ({ where }) => items.filter(i => where.sku.in.includes(i.sku)) },
      $transaction: async (fn) => {
        const tx = {
          order: { create: async ({ data }) => ({ id: 99, ...data }) },
          orderItem: { create: async () => ({}) }
        };
        return await fn(tx);
      }
    }
  };
});

test('crea orden PENDING con totales', async () => {
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ sku: 'BURGER-CHS-S', qty: 2 }] })
  });
  const res = await createOrder(req);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.order.status).toBe('PENDING');
  expect(json.order.total).toBeGreaterThan(0);
});
