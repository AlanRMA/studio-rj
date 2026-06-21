# Projeto James — Gerador de Nota de Pagamento

Estrutura independente para copiar em outro repositório. Usa o **mesmo Supabase** da Rosania, mas grava em `dev.james_receipts` / `prod.james_receipts` com `responsavel = 'James'`.

## Estrutura

```
james/
├── frontend/     # Next.js — porta 9003
├── backend/      # Express — porta 4001
└── examples/     # Screenshots do layout anterior
```

## Setup local (backend)

**Importante:** os comandos abaixo devem ser rodados dentro de `james/backend`, não na pasta da Rosania.

```bash
cd james/backend
npm install
npm run setup:env      # cria .env e copia DATABASE_URL da Rosania (se existir)
# ou manualmente: cp .env.example .env
npm run check:db       # testa conexão antes do migrate
npm run migrate:all    # cria dev.james_receipts e prod.james_receipts
npm run dev            # http://localhost:4001
```

No `.env`, use a **mesma `DATABASE_URL`** do backend da Rosania. Troque a `INGEST_API_KEY` (pode ser diferente da Rosania).

### Migrate não funciona?

| Erro | Solução |
|------|---------|
| `Configure DATABASE_URL no .env` | Rode `npm run setup:env` ou crie `.env` com `DATABASE_URL=...` |
| `Arquivo .env não encontrado` | Confirme que está em `james/backend`, não em `receipt-backend` |
| `password authentication failed` | Senha errada na URI — copie de novo do Supabase |
| `tsx: command not found` | Rode `npm install` antes |
| `ENOTFOUND` / `ECONNREFUSED` | URI incompleta — use a connection string do pooler Supabase |

### Testar o backend

Com o servidor rodando em outro terminal:

```bash
npm run test:crud
```

Testa: migration → CREATE → READ → UPDATE → DELETE na tabela `james_receipts`.

Outros comandos úteis (iguais ao da Rosania):

```bash
npm run seed:dummy 20   # insere 20 recibos de teste
npm run clean:dev       # limpa dev.james_receipts
```

## Setup local (frontend)

```bash
cd james/frontend
cp .env.example .env.local
```

```env
RECEIPT_API_URL=http://localhost:4001
RECEIPT_API_KEY=mesma-chave-do-backend
```

```bash
npm install
npm run dev   # http://localhost:9003
```

## Deploy do backend (Render)

1. Crie um **novo Web Service** no [Render](https://render.com) apontando para a pasta `james/backend` (ou repo com essa pasta).
2. Configure as variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `APP_ENV` | `production` |
| `DATABASE_URL` | Mesma URI do Supabase (igual Rosania) |
| `INGEST_API_KEY` | Chave longa e aleatória (anote para o frontend) |
| `ALLOWED_ORIGINS` | URL do frontend James no Vercel, ex: `https://james-notas.vercel.app` |

3. O `render.yaml` já define `healthCheckPath: /api/v1/ingest/health`.
4. Após o deploy, rode a migration **uma vez** (no Shell do Render ou local com `APP_ENV=production`):

```bash
npm run migrate:prod
```

5. Teste o health:

```bash
curl https://SEU-BACKEND.onrender.com/api/v1/ingest/health
```

Resposta esperada: `"table": "prod.james_receipts"`, `"responsavel": "James"`.

## Deploy do frontend (Vercel)

1. Importe a pasta `james/frontend` no Vercel.
2. Variáveis de ambiente:

| Variável | Valor |
|----------|-------|
| `RECEIPT_API_URL` | URL do backend James no Render |
| `RECEIPT_API_KEY` | Mesma `INGEST_API_KEY` do backend |

3. Deploy. Abra o app, preencha uma nota e clique **Gerar JPEG** ou **Gerar PDF**.

## Tabelas no Supabase

| Ambiente | Tabela Rosania | Tabela James |
|----------|----------------|--------------|
| Dev | `dev.rosania_receipts` | `dev.james_receipts` |
| Prod | `prod.rosania_receipts` | `prod.james_receipts` |

Os dados ficam separados; só o projeto Supabase é compartilhado.

## Formato das linhas (JSONB)

```json
{
  "line_id": "uuid",
  "line_order": 1,
  "ref": "A1",
  "descricao": "Instalação",
  "quantity": 2,
  "unit_price": 75,
  "is_risk": false,
  "line_total": 150
}
```