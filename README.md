# smokeeat-backend-v4

Backend de **Smokeeat** (Next.js + Prisma + MySQL) con Docker/Compose, seeds y pruebas con Vitest.
Incluye endpoints para órdenes, inventario, webhooks de pagos e integración de Instagram.

---

## 🚀 Stack
- **Runtime:** Node.js 20
- **Framework:** Next.js (App Router, `api/*/route.js`)
- **ORM:** Prisma 6
- **DB:** MySQL 8
- **Tests:** Vitest
- **Container:** Docker + docker-compose

## 📁 Estructura (resumen)
```
app/
  api/
    orders/route.js
    inventory/low-stock/route.js
    webhooks/payments/route.js
    ig/webhook/route.js
lib/
  prisma.js
  inventory.js
  ig.js
prisma/
  schema.prisma
  seed.js
tests/
  unit.*.test.js
  e2e.flow.test.js
docker/
  entrypoint.sh
vitest.config.mjs
```

## 🧩 Variables de entorno
Crea un archivo `.env` en la raíz (o usa `.env.local` para desarrollo). Ejemplo:

```
# Con Docker (servicio "db" en docker-compose.yml)
DATABASE_URL="mysql://root:root@db:3306/smokeeat"
# Sin Docker (local MySQL)
# DATABASE_URL="mysql://usuario:password@localhost:3306/smokeeat"
```

> Ajusta usuario/contraseña según tu entorno. Si usas Docker, el host es `db` (nombre del servicio).

---

## ▶️ Levantar el proyecto con Docker

```bash
docker compose up -d --build
```

Inicializar BD, ejecutar seeds y correr pruebas **dentro del contenedor** (esperando a MySQL):

```bash
docker compose run --rm --entrypoint sh app -lc "until nc -z db 3306; do echo '⌛ esperando db...'; sleep 1; done; prisma db push --accept-data-loss && node prisma/seed.js && npx -y vitest --run"
```

> Ese comando:
> 1) Espera la DB, 2) sincroniza el esquema (`db push`), 3) ejecuta el seed y 4) corre Vitest en modo `--run`.

Para ver la DB con **Adminer** abre: http://localhost:8080  
- **System:** MySQL  
- **Server:** db  
- **Username:** root  
- **Password:** (la definida en tu compose)  
- **Database:** smokeeat  

---

## 🧪 Pruebas
Ejecutar tests en el contenedor ya levantado:

```bash
docker compose run --rm --entrypoint sh app -lc "npx -y vitest --run"
```

Ejecutar pruebas con watcher (fuera de Docker, si tienes Node 20 y deps instaladas):
```bash
npm i
npx vitest
```

---

## 🗃️ Prisma
Sincronizar esquema y regenerar cliente:
```bash
npx prisma db push
npx prisma generate
```

Seed (puebla datos básicos como ítems, BOMs, etc.):
```bash
node prisma/seed.js
```

---

## 📚 API (resumen)

> La especificación OpenAPI está en `docs/openapi.yaml`. Puedes abrirla en [editor.swagger.io](https://editor.swagger.io/) o importarla en Swagger UI.

### 1) Crear orden
**POST** `/api/orders`

Crea una orden en estado **PENDING** con sus ítems y totales.

**Body (JSON):**
```json
{
  "items": [
    { "itemId": 4, "qty": 2, "unitPrice": 3950 }
  ]
}
```

**200 OK (ejemplo):**
```json
{
  "order": {
    "id": 10,
    "status": "PENDING",
    "subtotal": 7900,
    "total": 7900,
    "cogs": 0,
    "grossProfit": 0,
    "items": [
      { "itemId": 4, "qty": 2, "unitPrice": 3950, "lineTotal": 7900 }
    ]
  }
}
```

### 2) Webhook de pagos (aprobado)
**GET** `/api/webhooks/payments?status=approved&orderId=10`

Marca la orden como **PAID**, calcula **COGS** a partir del BOM e impacta **grossProfit**.

**200 OK (ejemplo):**
```json
{
  "order": {
    "id": 10,
    "status": "PAID",
    "cogs": 1000,
    "grossProfit": 6900
  }
}
```

### 3) Stock bajo
**GET** `/api/inventory/low-stock`

Retorna ítems con stock <= punto de reposición.

**200 OK (ejemplo):**
```json
{
  "lowStock": [
    { "sku": "PAN", "name": "Pan de hamburguesa", "soh": 2, "reorderPoint": 5 }
  ]
}
```

### 4) Webhook de Instagram
- **GET** `/api/ig/webhook` → handshake de verificación (`hub.mode`, `hub.verify_token`, `hub.challenge`)
- **POST** `/api/ig/webhook` → recibe mensajes, puede responder/confirmar lectura según reglas de `lib/ig.js`.

---

## 🧰 Endpoints de utilidad (curl)

Crear orden:
```bash
curl -X POST http://localhost:3000/api/orders   -H "Content-Type: application/json"   -d '{"items":[{"itemId":4,"qty":2,"unitPrice":3950}]}'
```

Simular pago aprobado:
```bash
curl "http://localhost:3000/api/webhooks/payments?status=approved&orderId=10"
```

Listar low-stock:
```bash
curl http://localhost:3000/api/inventory/low-stock
```

Verificar IG (ejemplo):
```bash
curl "http://localhost:3000/api/ig/webhook?hub.mode=subscribe&hub.verify_token=TEST&hub.challenge=1234"
```

---

## ❗ Troubleshooting

- **P1001: Can't reach database server**  
  Asegúrate de que el contenedor `db` esté healthy y usa el comando con `nc -z db 3306` para esperar la DB.

- **Errores por CRLF en `entrypoint.sh` (Windows)**  
  El Dockerfile ya normaliza EOL con `sed -i 's/
$//'`, pero verifica que Git no convierta a CRLF.

- **Cambios de esquema que no aplican**  
  Ejecuta `docker compose down -v` para borrar el volumen de datos y reconstruir desde cero.

---

## 📄 Licencia
MIT
