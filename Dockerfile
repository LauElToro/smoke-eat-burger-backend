FROM node:20-bullseye AS builder
WORKDIR /app

# Instalar deps respetando lockfile si existe
COPY package.json package-lock.json* ./
RUN bash -lc 'if [ -f package-lock.json ]; then npm ci; else npm install; fi'

# Copiar código fuente
COPY . .

# Asegurar carpeta public/ para evitar fallos de COPY posteriores
RUN test -d public || mkdir public

# Generar Prisma Client y build de Next (standalone)
RUN npx prisma generate && npm run build


# ========= Runtime =========
FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production

# Utilidad para esperar DB
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# Prisma CLI global (evita problemas de módulos faltantes en runtime)
RUN npm i -g prisma@6.15.0

# Artefactos de Next (standalone) y estáticos
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Config de tests (para alias "@", etc.)
COPY --from=builder /app/vitest.config.mjs ./

# Prisma (schema + engines) y bcryptjs para seed
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Código necesario para tests/endpoints
COPY --from=builder /app/tests ./tests
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]