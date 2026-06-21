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
npm run dev
```

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