# To Do List — React + Vite + Fastify + MySQL

Aplicação de tarefas com frontend React/Vite responsivo e backend Fastify conectado ao MySQL. A interface usa o mockup como referência visual: fundo bege, painel escuro, tarefas em linhas, caixas de seleção azuis, modais e botão flutuante de criação.

## Requisitos
- Node.js 20 ou superior
- MySQL 8 (ou versão compatível)
- npm

## 1. Preparar o banco
Na raiz do projeto, execute:

```bash
mysql -u root -p < backend/schema.sql
```

## 2. Configurar e iniciar o backend

```bash
cd backend
cp .env.example .env
```

Edite `backend/.env` com as credenciais do seu MySQL. Depois:

```bash
npm install
npm run dev
```

API: `http://localhost:3333`  
Health check: `http://localhost:3333/health`

## 3. Iniciar o frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Se a API estiver em outro endereço, ajuste `VITE_API_URL` no arquivo `frontend/.env`.

## Funcionalidades
- Listar tarefas e mostrar contadores de tarefas totais, pendentes e concluídas.
- Criar tarefa em modal com data limite opcional.
- Editar título e data limite em modal.
- Excluir tarefa com confirmação.
- Marcar/desmarcar tarefa como concluída.
- Busca com debounce de 350 ms, usando `GET /api/tasks?search=`.
- Ordenação automática: tarefas pendentes primeiro, as com prazo mais próximo antes; sem prazo por último. Concluídas ficam abaixo.
- Prazo vencido em vermelho com selo “Em atraso”.
- Ações de editar/excluir aparecem ao passar o mouse (sempre visíveis em telas touch pequenas).
- Estado vazio com o texto “You have no pending tasks.”
- Botão flutuante “+” no canto inferior direito.

## Rotas da API
- `GET /api/tasks?search=termo`
- `POST /api/tasks` — `{ "title": "Estudar", "dueDate": "2026-10-25" }`
- `PATCH /api/tasks/:id` — campos opcionais `title`, `dueDate`, `completed`
- `DELETE /api/tasks/:id`

## Observação
Os arquivos enviados tinham o `server.js` apontando para `routes/tasks.js`, mas essa rota não estava entre os arquivos recebidos. Ela foi implementada neste projeto para que o frontend tenha endpoints funcionais. O `.env` real não foi incluído por segurança; use `.env.example` como modelo.
