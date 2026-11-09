import { pool } from '../db.js';

function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    completed: Boolean(row.completed),
    dueDate: row.due_date || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export default async function tasksRoutes(app) {
  app.get('/api/tasks', async (request, reply) => {
    const search = String(request.query?.search || '').trim();
    try {
      const [rows] = await pool.execute(
        `SELECT id, title, completed, due_date, created_at, updated_at
         FROM tasks
         WHERE (? = '' OR title LIKE ?)
         ORDER BY
           CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
           due_date ASC,
           created_at DESC`,
        [search, `%${search}%`]
      );
      return rows.map(toTask);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Não foi possível listar as tarefas.' });
    }
  });

  app.post('/api/tasks', async (request, reply) => {
    const title = String(request.body?.title || '').trim();
    const dueDate = request.body?.dueDate || null;
    if (!title) return reply.code(400).send({ error: 'O título é obrigatório.' });
    if (title.length > 255) return reply.code(400).send({ error: 'O título deve ter até 255 caracteres.' });
    try {
      const [result] = await pool.execute(
        'INSERT INTO tasks (title, due_date) VALUES (?, ?)',
        [title, dueDate]
      );
      const [rows] = await pool.execute(
        'SELECT id, title, completed, due_date, created_at, updated_at FROM tasks WHERE id = ?',
        [result.insertId]
      );
      return reply.code(201).send(toTask(rows[0]));
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Não foi possível criar a tarefa.' });
    }
  });

  app.patch('/api/tasks/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return reply.code(400).send({ error: 'ID inválido.' });
    const body = request.body || {};
    const fields = [];
    const values = [];

    if (Object.hasOwn(body, 'title')) {
      const title = String(body.title || '').trim();
      if (!title) return reply.code(400).send({ error: 'O título é obrigatório.' });
      if (title.length > 255) return reply.code(400).send({ error: 'O título deve ter até 255 caracteres.' });
      fields.push('title = ?'); values.push(title);
    }
    if (Object.hasOwn(body, 'completed')) {
      fields.push('completed = ?'); values.push(body.completed ? 1 : 0);
    }
    if (Object.hasOwn(body, 'dueDate')) {
      fields.push('due_date = ?'); values.push(body.dueDate || null);
    }
    if (!fields.length) return reply.code(400).send({ error: 'Nenhum campo para atualizar.' });

    try {
      values.push(id);
      const [result] = await pool.execute(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
      if (!result.affectedRows) return reply.code(404).send({ error: 'Tarefa não encontrada.' });
      const [rows] = await pool.execute(
        'SELECT id, title, completed, due_date, created_at, updated_at FROM tasks WHERE id = ?',
        [id]
      );
      return toTask(rows[0]);
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Não foi possível atualizar a tarefa.' });
    }
  });

  app.delete('/api/tasks/:id', async (request, reply) => {
    const id = Number(request.params.id);
    if (!Number.isInteger(id) || id < 1) return reply.code(400).send({ error: 'ID inválido.' });
    try {
      const [result] = await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);
      if (!result.affectedRows) return reply.code(404).send({ error: 'Tarefa não encontrada.' });
      return reply.code(204).send();
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ error: 'Não foi possível excluir a tarefa.' });
    }
  });
}
