# Studio RJ

O projeto usa:

- `frontend/`: editor estático publicado na Vercel;
- `supabase/`: migration PostgreSQL e Edge Function para persistência no Supabase Free.

O navegador mantém somente os cinco JPEG/PDF mais recentes. O Supabase guarda os dados estruturados de todas as notas, sem imagens, permitindo pesquisa por ID, início da referência ou data e reconstrução posterior no editor.

## Rodar o frontend

```sh
cd frontend
npm ci
npm run dev
```

Abra http://localhost:9003.

## Configurar o Supabase

Siga [SUPABASE-SETUP.md](SUPABASE-SETUP.md). Depois informe a URL do projeto e a `APP_ACCESS_KEY` em **Configurações > Supabase**.

A tabela tem Row Level Security habilitada e não permite acesso direto público. A Edge Function valida `APP_ACCESS_KEY` e usa internamente a credencial administrativa fornecida pelo próprio Supabase.

## Publicar o frontend na Vercel

Use o repositório `AlanRMA/studio-rj` com:

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`

O frontend continua estático. A URL e a chave do Supabase ficam no localStorage de cada navegador.

## Validar

```sh
cd frontend
npm run typecheck
npm run build
```

A pasta `backend/` contém a API Express anterior e não é usada na publicação atual.
