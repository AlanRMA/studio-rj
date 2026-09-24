# Configurar o Supabase Free — RJ Notas

Projeto criado:

- Nome: `RJ Notas`
- Project ref: `ugpcksezqdbxpgkwursc`
- URL: `https://ugpcksezqdbxpgkwursc.supabase.co`

A senha do banco é usada apenas pelo Supabase CLI quando solicitada. Não coloque essa senha no site, no GitHub ou nas configurações do frontend.

## 1. Entrar e vincular o projeto

Na raiz do repositório:

```sh
npx supabase@latest login
npx supabase@latest link --project-ref ugpcksezqdbxpgkwursc
```

O segundo comando poderá solicitar a senha do banco.

## 2. Criar a tabela

```sh
npx supabase@latest db push
```

A migration cria `public.james_receipts`, ativa RLS e bloqueia acesso direto das chaves públicas. Somente a Edge Function, usando a credencial interna do Supabase, acessa a tabela.

## 3. Criar a chave de acesso do aplicativo

```sh
APP_ACCESS_KEY="$(openssl rand -hex 32)"
printf 'APP_ACCESS_KEY=%s\n' "$APP_ACCESS_KEY"
npx supabase@latest secrets set APP_ACCESS_KEY="$APP_ACCESS_KEY"
```

Guarde o valor exibido. Essa é a chave que será cadastrada nos dois computadores. Não use a senha do banco como chave do aplicativo.

## 4. Publicar a Edge Function

```sh
npx supabase@latest functions deploy receipts --project-ref ugpcksezqdbxpgkwursc --no-verify-jwt
```

Endpoint publicado:

```text
https://ugpcksezqdbxpgkwursc.supabase.co/functions/v1/receipts
```

## 5. Configurar o site

Em https://studio-riscos-digitais.vercel.app/ abra **Configurações > Supabase** e informe:

- **URL do projeto Supabase:** `https://ugpcksezqdbxpgkwursc.supabase.co`
- **Chave de acesso do aplicativo:** o valor de `APP_ACCESS_KEY` gerado no passo 3

Clique em **Testar Supabase** e depois em **Salvar**.

Repita somente o passo 5 no computador do seu padrasto, usando exatamente a mesma URL e a mesma `APP_ACCESS_KEY`.

## Onde localizar os valores depois

- URL do projeto: Dashboard do Supabase > botão **Connect**.
- Edge Function: Dashboard > **Edge Functions** > `receipts`.
- Segredo configurado: Dashboard > **Edge Functions** > **Secrets**. O Supabase não mostra novamente o conteúdo do segredo; se ele for perdido, gere outro e atualize os dois computadores.
- Registros: Dashboard > **Table Editor** > `james_receipts`.
