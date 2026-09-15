# Studio RJ — frontend

Aplicação Next.js estática, sem backend. Rascunhos, notas JPEG/PDF, logo e configurações ficam no localStorage do navegador. Limpar os dados do site remove esse histórico; ele não é compartilhado entre dispositivos. Baixe os arquivos que desejar guardar.

## Rodar localmente

```sh
npm ci
npm run dev
```

Abra http://localhost:9003.

## Publicar na Vercel

Importe `AlanRMA/studio-rj` e configure:

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: padrão do framework (exportação em `out`)
- Variáveis de ambiente: nenhuma

O backend da outra pasta não faz parte desta publicação.

## Validar

```sh
npm run typecheck
npm run build
```
