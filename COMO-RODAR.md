# Studio RJ

## Frontend sem backend

O frontend funciona sozinho, com dados armazenados no navegador (localStorage).

```sh
cd frontend
npm ci
npm run dev
```

Abra http://localhost:9003.

## Vercel

Importe o repositório `AlanRMA/studio-rj`, selecione **Root Directory: frontend** e **Framework Preset: Next.js**. Use `npm ci` para instalar e `npm run build` para compilar. Mantenha Output Directory no padrão do framework.

Não configure variáveis de backend: esta versão não usa API, Render ou Supabase. O build exporta o site estático para `frontend/out`.

Rascunhos, logo, configurações e notas geradas ficam neste navegador. Os dados não sincronizam entre dispositivos e são removidos ao limpar os dados do site. Baixe os PDFs/JPEGs para guardar uma cópia.

A pasta `backend/` contém a implementação anterior e não faz parte do frontend publicado.

Mais detalhes em [frontend/README.md](frontend/README.md).
