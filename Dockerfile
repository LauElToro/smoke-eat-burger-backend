FROM node:20-bullseye AS builder
WORKDIR /app

# Instalar deps (respeta el lock si existe)
COPY package.json package-lock.json* ./
RUN bash -lc 'if [ -f package-lock.json ]; then npm ci; else npm install; fi'

# Copiar código
COPY . .

# Asegurar carpeta public/ para evitar fallos de COPY en runtime
RUN test -d public || mkdir public

# Prisma Client + build de Next (standalone)
RUN npx prisma generate && npm run build

# Empaquetar opcionales (si existen) para poder copiarlos después
RUN mkdir -p /opt/optional-config \
 && [ -f tsconfig.json ] && cp tsconfig.json /opt/optional-config/ || true \
 && [ -f jsconfig.json ] && cp jsconfig.json /opt/optional-config/ || true

# ========= Runtime / Test Runner =========
FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production

# Utilidad para esperar DB
RUN apt-get update && apt-get install -y --no-install-recommends netcat-openbsd \
  && rm -rf /var/lib/apt/lists/*

# Prisma CLI global (para ci:db)
RUN npm i -g prisma@6.15.0

# Artefactos de Next
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Config de Vitest
COPY --from=builder /app/vitest.config.mjs ./

# Copiar opcionales si los había
COPY --from=builder /opt/optional-config/ ./

# Prisma (schema + engines) y libs usadas por seed/tests
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# *** deps que faltaban en tests ***
COPY --from=builder /app/node_modules/decimal.js ./node_modules/decimal.js
COPY --from=builder /app/node_modules/luxon ./node_modules/luxon

# Código fuente que usan los tests
COPY --from=builder /app/tests ./tests
COPY --from=builder /app/app ./app
COPY --from=builder /app/lib ./lib

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
