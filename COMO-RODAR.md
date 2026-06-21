# Como rodar — copie e cole no Terminal

## Onde está o projeto

```
/Users/macbook/Documents/Code/studio-rj/
├── backend/     ← migrate e API
└── frontend/    ← app (porta 9003)
```

**Não use** a pasta `studio-rm` (porta 9002) — essa é da Rosania.

---

## 1. Backend (migrate + servidor)

```bash
cd /Users/macbook/Documents/Code/studio-rj/backend
npm install
npm run migrate:all
npm run dev
```

Deixe esse terminal aberto. Deve aparecer: `james-receipt-backend rodando em http://localhost:4001`

---

## 2. Frontend (outro terminal)

```bash
cd /Users/macbook/Documents/Code/studio-rj/frontend
npm install
cp .env.example .env.local
npm run dev
```

O `.env.local` **precisa** apontar para o backend James:

```env
RECEIPT_API_URL=http://localhost:4001
RECEIPT_API_KEY=JamesChaveApi
```

(mesma `INGEST_API_KEY` do `backend/.env` — **não** use porta 4000)

**Reinicie** o `npm run dev` depois de mudar o `.env.local`.

Abra: **http://localhost:9003**

---

## Porta 9002 ocupada?

Você abriu o app da **Rosania** por engano. Mate o processo:

```bash
lsof -i :9002 -t | xargs kill
```

O James usa a porta **9003**, não 9002.

---

## "cd: no such file or directory: studio-rj/backend"

Você não está na pasta certa. Use o caminho **completo**:

```bash
cd /Users/macbook/Documents/Code/studio-rj/backend
```

Para ver onde você está agora:

```bash
pwd
```

---

## Salvou no navegador mas não no Supabase?

| Causa | Solução |
|-------|---------|
| Backend não rodando | Terminal 1: `cd backend && npm run dev` |
| `.env.local` errado (porta 4000 / chave Rosania) | Use `4001` + `JamesChaveApi` |
| Não reiniciou o frontend após mudar `.env` | Pare e rode `npm run dev` de novo |
| Procurando em `prod.james_receipts` | Teste local grava só em **`dev.james_receipts`** |
| Deploy Vercel | Veja seção **Deploy (Vercel)** abaixo |

---

## Deploy (Vercel) — frontend

O Next.js está em `frontend/`, **não** na raiz do repositório. Se o build falhar com *"No Next.js version detected"*, o Root Directory está errado.

1. [Vercel Dashboard](https://vercel.com/dashboard) → seu projeto → **Settings** → **Build and Deployment**
2. **Root Directory** → **Edit** → digite `frontend` → **Save**
3. **Framework Preset** → **Next.js** (não deixe em "Other")
4. **Output Directory** → deixe **vazio** / padrão (não use `public`)
5. **Environment Variables** (Production e Preview):

| Variável | Valor |
|----------|-------|
| `RECEIPT_API_URL` | URL do backend James no Render (sem barra no final) |
| `RECEIPT_API_KEY` | Mesma `INGEST_API_KEY` do backend |

6. **Redeploy** (Deployments → ⋯ → Redeploy)

Se aparecer *"No Output Directory named public found"*, o Framework Preset está em **Other**. O arquivo `frontend/vercel.json` força **Next.js**; confira também o passo 3 acima.

O build local deve passar:

```bash
cd /Users/macbook/Documents/Code/studio-rj/frontend
npm run build
```

Depois do deploy, copie a URL do Vercel (ex: `https://seu-app.vercel.app`) e coloque em `ALLOWED_ORIGINS` no Render.

---

## Deploy (Render) — backend

1. Novo Web Service → repositório `studio-rj`
2. **Root Directory:** `backend`
3. **Build Command:** `npm install --include=dev && npm run build`
4. **Start Command:** `npm start`
5. Variáveis: `APP_ENV=production`, `DATABASE_URL`, `INGEST_API_KEY`, `ALLOWED_ORIGINS` (URL do Vercel)
6. Após o deploy, no Shell do Render: `npm run migrate:prod`