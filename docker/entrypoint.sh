#!/bin/sh
set -e

echo "⏳ Esperando a MySQL en ${DATABASE_URL:-mysql://user:pass@db:3306/db} ..."
# Si tenés nc disponible, esperá al puerto 3306 del servicio 'db'
if command -v nc >/dev/null 2>&1; then
  until nc -z db 3306; do
    echo "⌛ db aún no responde..."; sleep 1
  done
fi
echo "✅ DB arriba"

# Aplicar migraciones o sincronizar el schema
if ! prisma migrate deploy; then
  echo "ℹ️ migrate deploy falló, probando prisma db push (con riesgo de pérdida de datos en dev)"
  prisma db push --accept-data-loss
fi

# Seed (ignorar error para no tumbar el contenedor si ya está seeded)
if [ -f prisma/seed.js ]; then
  echo "🌱 Ejecutando seed..."
  node prisma/seed.js || echo "⚠️ Seed falló o ya aplicado"
fi

# Correr tests en CI si se pide
if [ "${CI_TEST:-0}" = "1" ]; then
  echo "🧪 Ejecutando tests (CI_TEST=1)"
  npx -y vitest --run || true
fi

# Levantar Next standalone
echo "🚀 Iniciando app"
exec node server.js
