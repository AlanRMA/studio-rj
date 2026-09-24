# Studio RJ — frontend

Aplicação Next.js estática para criar e reconstruir notas de pagamento.

- Rascunhos, logo e configurações ficam no localStorage.
- Somente os cinco JPEG/PDF mais recentes permanecem no navegador.
- Ao gerar um arquivo, os dados estruturados são enviados à Edge Function do Supabase.
- Se o Supabase estiver temporariamente indisponível, o registro fica em uma fila local.
- A busca em **Minhas Notas** consulta por ID exato, início da referência ou data.

## Rodar localmente

```sh
npm ci
npm run dev
```

Abra http://localhost:9003 e configure a URL e a `APP_ACCESS_KEY` em **Configurações > Supabase**.

## Publicar na Vercel

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: padrão do framework
- Variáveis de ambiente: nenhuma

## Validar

```sh
npm run typecheck
npm run build
```
