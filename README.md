# SmokeEat Backend (Next.js + MySQL + Docker)

- Stock por lotes (FIFO), BOM de ingredientes, pedidos, COGS, margen bruto/neto.
- Auth (JWT en cookie) con roles ADMIN/USER.
- Panel `/admin` protegido y `/login`.
- Cierre de circuito de checkout con webhook de pago.

## Run
```bash
docker compose up -d --build
# ó local:
npm i
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Tests
```bash
npm i
npm run test
```
> Los tests usan **Vitest** y mockean Prisma/Inventory para validar flujos.


## Instagram Auto-reply (API oficial)

- Endpoint de webhook: `/api/ig/webhook` (usa GET para verificación y POST para eventos)
- Variables `.env` requeridas: `VERIFY_TOKEN`, `PAGE_TOKEN`, `IG_ID`, `TIMEZONE`, `OPEN_*` y `ORDER_URL`.
- Responde **igual para todos** según horario (abierto/cerrado).

### Pasos (Meta Developers)
1) Convertí tu IG a **Professional** y vincúlalo a una **Facebook Page**.
2) En **Meta for Developers**: creá app → agregá **Messenger/Instagram**.
3) En **Webhooks** (para Pages): suscribite a **mensajes de Instagram** y seteá Callback URL: `https://TU_HOST/api/ig/webhook` + `VERIFY_TOKEN`.
4) En **Messenger Settings**: habilitá **Instagram Messaging** para la Page y poné tu app como **Primary Receiver** (Handover) para recibir los DMs en tu app (si Business Suite está como primaria, no llegan a tu webhook).
5) Probá enviando un DM a tu IG: tu app responderá el mensaje de **abierto/cerrado** según `.env`.

### Probar local
- Exponé tu `localhost:3000` con `ngrok http 3000` y usá la URL de ngrok como Callback.

### Tests del webhook IG
```bash
# dentro de Docker o local
npm run test -- -t igwebhook
```
