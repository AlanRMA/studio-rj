# Studio RJ — frontend

Aplicação Next.js estática para criar e reconstruir notas de pagamento.

- Rascunhos, logo e configurações ficam no localStorage.
- Somente os cinco JPEG/PDF mais recentes permanecem no navegador.
- Ao gerar um arquivo, os dados estruturados da nota são enviados à API configurada.
- Se o servidor estiver temporariamente indisponível, o registro fica em uma fila local e a sincronização é repetida quando a conexão voltar.
- A busca em **Minhas Notas** consulta o PostgreSQL por ID, referência ou data e carrega a nota encontrada no editor.

## Rodar localmente

```sh
npm ci
npm run dev
```

Abra http://localhost:9003. Configure a API em **Configurações > Servidor de Registros**.

## Publicar na Vercel

- Root Directory: `frontend`
- Framework Preset: Next.js
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: padrão do framework
- Variáveis de ambiente: nenhuma

A chave da API é cadastrada pelo usuário no navegador; ela não faz parte do pacote público do site.

## Validar

```sh
npm run typecheck
npm run build
```
