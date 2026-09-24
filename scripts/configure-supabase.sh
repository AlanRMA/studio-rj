#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="ugpcksezqdbxpgkwursc"
PROJECT_URL="https://${PROJECT_REF}.supabase.co"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_FILE="${REPO_ROOT}/supabase-app-key.local.txt"

cd "$REPO_ROOT"

echo "1/5 Entrando no Supabase..."
npx --yes supabase@latest login

echo "2/5 Vinculando o projeto RJ Notas..."
npx --yes supabase@latest link --project-ref "$PROJECT_REF"

echo "3/5 Criando/atualizando a tabela..."
npx --yes supabase@latest db push

if [[ ! -f "$KEY_FILE" ]]; then
  umask 077
  openssl rand -hex 32 > "$KEY_FILE"
fi
APP_ACCESS_KEY="$(cat "$KEY_FILE")"

echo "4/5 Configurando a chave da Edge Function..."
npx --yes supabase@latest secrets set "APP_ACCESS_KEY=${APP_ACCESS_KEY}" --project-ref "$PROJECT_REF"

echo "5/5 Publicando a Edge Function..."
npx --yes supabase@latest functions deploy receipts --project-ref "$PROJECT_REF" --no-verify-jwt

printf '\nConfiguração concluída.\n'
printf 'URL do projeto Supabase: %s\n' "$PROJECT_URL"
printf 'Chave de acesso do aplicativo: %s\n' "$APP_ACCESS_KEY"
printf '\nA chave também ficou salva somente neste computador em:\n%s\n' "$KEY_FILE"
printf '\nCadastre esses dois valores em Configurações > Supabase no site.\n'
