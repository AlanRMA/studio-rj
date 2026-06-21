#!/usr/bin/env bash
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$BACKEND_DIR/.env"
ROSANIA_ENV="$(cd "$BACKEND_DIR/../../.." && pwd)/receipt-backend/.env"

if [[ -f "$ENV_FILE" ]]; then
  echo ".env já existe em $ENV_FILE"
  exit 0
fi

cp "$BACKEND_DIR/.env.example" "$ENV_FILE"

if [[ -f "$ROSANIA_ENV" ]]; then
  DB_URL=$(grep '^DATABASE_URL=' "$ROSANIA_ENV" | cut -d= -f2- || true)
  if [[ -n "$DB_URL" ]]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$ENV_FILE"
    else
      sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$ENV_FILE"
    fi
    echo "DATABASE_URL copiada do backend da Rosania."
  fi
fi

echo "Arquivo criado: $ENV_FILE"
echo "Revise INGEST_API_KEY e rode: npm run migrate:all"