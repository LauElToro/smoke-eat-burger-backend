import { GET as verify, POST as receive } from '@/app/api/ig/webhook/route';

// Mock env
process.env.VERIFY_TOKEN = 'token123';
process.env.IG_ID = '1784';
process.env.PAGE_TOKEN = 'EAAX';
process.env.ORDER_URL = 'https://smokeeatburger.com/menu';
process.env.TIMEZONE = 'America/Argentina/Buenos_Aires';
process.env.OPEN_DAYS = '2,3,4,5,6,7';
process.env.OPEN_START = '00:00';
process.env.OPEN_END = '23:59'; // para que el test esté "abierto"

// Mock fetch (Graph API)
global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'm1' }) }));

test('webhook verify OK', async () => {
  const req = new Request('http://localhost/api/ig/webhook?hub.mode=subscribe&hub.verify_token=token123&hub.challenge=abc');
  const res = await verify(req);
  expect(res.status).toBe(200);
  const text = await res.text();
  expect(text).toBe('abc');
});

test('receive IG message -> send reply + mark seen', async () => {
  const payload = {
    object: "instagram",
    entry: [
      { messaging: [ { sender: { id: "USER_IGSID" }, message: { text: "hola" } } ] }
    ]
  };
  const req = new Request('http://localhost/api/ig/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const res = await receive(req);
  expect(res.status).toBe(200);
  // 2 llamadas a fetch: send message + mark seen
  expect(fetch).toHaveBeenCalledTimes(2);
  const [call1, call2] = fetch.mock.calls;
  expect(String(call1[0])).toMatch(/graph\.facebook\.com/);
  expect(String(call2[0])).toMatch(/graph\.facebook\.com/);
});