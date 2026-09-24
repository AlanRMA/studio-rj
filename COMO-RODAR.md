# Studio RJ

O projeto tem duas partes:

- `frontend/`: editor estático publicado na Vercel;
- `backend/`: API Express publicada no Render, com PostgreSQL gerenciado.

O navegador mantém somente os cinco JPEG/PDF mais recentes. O PostgreSQL guarda os dados estruturados de todas as notas, sem imagens, para permitir pesquisa por ID, referência ou data e reconstrução posterior no editor.

## Rodar localmente

Frontend:

```sh
cd frontend
npm ci
npm run dev
```

Backend:

```sh
cd backend
npm ci
cp .env.example .env
# edite DATABASE_URL e INGEST_API_KEY
npm run migrate:dev
npm run dev
```

Abra http://localhost:9003 e informe a URL e a chave da API em **Configurações > Servidor de Registros**.

## Publicar

### Vercel

Importe `AlanRMA/studio-rj`, use **Root Directory: frontend**, o preset Next.js, `npm ci` e `npm run build`. O frontend continua como exportação estática e não recebe a chave do backend durante o build.

### Render

O arquivo [`render.yaml`](render.yaml) cria o serviço Node e um PostgreSQL gerenciado. No painel do Render, crie um Blueprint a partir do repositório. A migration da tabela `prod.james_receipts` é executada antes de cada publicação.

Depois da criação:

1. copie a URL pública do serviço;
2. copie o valor de `INGEST_API_KEY` gerado pelo Render;
3. no site, abra **Configurações > Servidor de Registros**;
4. informe os dois valores, teste a conexão e clique em **Salvar**.

A URL e a chave ficam apenas no localStorage desse navegador. O backend aceita requisições do domínio de produção configurado em `ALLOWED_ORIGINS`.

## Validação

```sh
cd backend && npm run build
cd ../frontend && npm run typecheck && npm run build
```
