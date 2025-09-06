import { GET as webhookGet } from '@/app/api/webhooks/payments/route';

// mock prisma + inventory
vi.mock('../../lib/prisma.js', () => {
  const order = {
    id: 10, status: 'PENDING', subtotal: 7900, discount: 0,
    items: [{ itemId: 1, qty: 2, item: { type: 'FINISHED', trackFinished: false } }]
  };
  return {
    prisma: {
      order: {
        findUnique: async ({ where }) => where.id === 10 ? order : null
      },
      $transaction: async (fn) => {
        const tx = {
          order: {
            update: async ({ where, data }) => ({ id: where.id, ...order, ...data })
          }
        };
        return await fn(tx);
      },
      order: { update: async ({ where, data }) => ({ id: where.id, ...order, ...data }) }
    }
  };
});

vi.mock('../../lib/inventory.js', () => ({
  explodeBOM: async () => ([{ itemId: 2, qty: 2 }]),
  consumeForOrder: async () => 1000
}));

test('webhook aprobado marca PAID y calcula COGS/Gross', async () => {
  const req = new Request('http://localhost/api/webhooks/payments?status=approved&orderId=10');
  const res = await webhookGet(req);
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.order.status).toBe('PAID');
  expect(json.order.cogs).toBe(1000);
  expect(json.order.grossProfit).toBeGreaterThan(0);
});
