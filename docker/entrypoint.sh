#!/usr/bin/env sh
set -e

# Esperar DB si hay variables/servicio configurado
if [ -n "$DATABASE_URL" ]; then
  host="$(echo "$DATABASE_URL" | sed -E 's/.*@([^:/]+).*/\1/')"
  port="$(echo "$DATABASE_URL" | sed -E 's/.*:([0-9]+)\/.*/\1/')"
  [ -z "$host" ] && host="db"
  [ -z "$port" ] && port="3306"
  echo "⏳ Esperando DB en $host:$port ..."
  until nc -z "$host" "$port"; do
    echo "  still waiting..."
    sleep 1
  done
  echo "✅ DB lista"
fi

# Sin migraciones: empujar schema y correr seed si corresponde
if command -v prisma >/dev/null 2>&1; then
  echo "▶ prisma db push"
  prisma db push --accept-data-loss || true
  if [ -f "prisma/seed.js" ]; then
    echo "▶ seed"
    node prisma/seed.js || true
  fi
fi

# Levantar Next standalone
node server.js
