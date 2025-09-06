import { POST as createOrder } from '@/app/api/orders/route';
import { GET as webhookGet } from '@/app/api/webhooks/payments/route';

// Mocks: combine prisma behaviors
const state = { createdOrderId: 101, saved: null };

vi.mock('../../lib/prisma.js', () => {
  const orderBase = {
    id: state.createdOrderId,
    status: 'PENDING',
    subtotal: 7900, discount: 0, tax: 0, total: 7900,
    items: [{ itemId: 1, qty: 2, item: { type: 'FINISHED', trackFinished: false } }]
  };
  return {
    prisma: {
      item: { findMany: async () => ([{ id:1, sku:'BURGER-CHS-S', price:3950, type:'FINISHED' }]) },
      $transaction: async (fn) => {
        const tx = {
          order: { create: async ({ data }) => ({ id: state.createdOrderId, ...data }) },
          orderItem: { create: async () => ({}) }
        };
        return await fn(tx);
      },
      order: {
        findUnique: async ({ where }) => (where.id === state.createdOrderId ? orderBase : null),
        update: async ({ where, data }) => (state.saved = { id: where.id, ...orderBase, ...data })
      }
    }
  };
});

vi.mock('../../lib/inventory.js', () => ({
  explodeBOM: async () => ([{ itemId: 2, qty: 2 }]),
  consumeForOrder: async () => 1000
}));

test('flujo e2e: crear orden -> aprobar pago -> PAID', async () => {
  const req = new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ sku: 'BURGER-CHS-S', qty: 2 }] })
  });
  const res = await createOrder(req);
  const j = await res.json();
  expect(j.order.status).toBe('PENDING');

  const webhookReq = new Request(`http://localhost/api/webhooks/payments?status=approved&orderId=${j.order.id}`);
  const wres = await webhookGet(webhookReq);
  const jr = await wres.json();
  expect(jr.order.status).toBe('PAID');
  expect(jr.order.cogs).toBe(1000);
});
