import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, CirclePlus, Pencil, Plus, Search, Trash2, X } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3333').replace(/\/$/, '');

function isOverdue(task) {
  if (!task.dueDate || task.completed) return false;
  // Compare ISO date-only strings to avoid UTC timezone shifts.
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return task.dueDate.slice(0, 10) < localToday;
}

function formatDate(date) {
  if (!date) return '';
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

function TaskModal({ task, onClose, onSave, saving }) {
  const [title, setTitle] = useState(task?.title || '');
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) || '');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function submit(event) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Digite um título para a tarefa.');
      return;
    }
    try {
      setError('');
      await onSave({ title: title.trim(), dueDate: dueDate || null });
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a tarefa.');
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">{task ? 'MANTENHA TUDO EM DIA' : 'UM PASSO DE CADA VEZ'}</span>
            <h2 id="modal-title">{task ? 'Edit Task' : 'Create Task'}</h2>
          </div>
          <button className="icon-button close-button" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="task-title">Task title</label>
          <input
            id="task-title"
            autoFocus
            maxLength={255}
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label htmlFor="task-date" className="date-label"><CalendarDays size={15} /> Due date <span>(optional)</span></label>
          <input id="task-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button-primary" disabled={saving}>
              {saving ? 'Saving…' : task ? 'Save changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [modalTask, setModalTask] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadTasks = useCallback(async (searchTerm = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      const response = await fetch(`${API_URL}/api/tasks?${params.toString()}`);
      if (!response.ok) throw new Error('Não foi possível carregar as tarefas. Confira se o backend está ligado.');
      const data = await response.json();
      setTasks(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Falha ao conectar com a API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(debouncedQuery); }, [debouncedQuery, loadTasks]);

  const sortedTasks = useMemo(() => [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || b.id - a.id;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.id - a.id;
  }), [tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (!response.ok) {
      let message = 'Algo deu errado. Tente novamente.';
      try { message = (await response.json()).error || message; } catch {}
      throw new Error(message);
    }
    if (response.status === 204) return null;
    return response.json();
  }

  async function saveTask(values) {
    setSaving(true);
    try {
      if (modalTask) {
        await request(`/api/tasks/${modalTask.id}`, { method: 'PATCH', body: JSON.stringify(values) });
        setNotice('Tarefa atualizada.');
      } else {
        await request('/api/tasks', { method: 'POST', body: JSON.stringify(values) });
        setNotice('Tarefa criada.');
      }
      setModalOpen(false);
      setModalTask(null);
      await loadTasks(debouncedQuery);
      window.setTimeout(() => setNotice(''), 2400);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task) {
    try {
      const updated = await request(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed })
      });
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Excluir a tarefa "${task.title}"?`)) return;
    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' });
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setNotice('Tarefa excluída.');
      window.setTimeout(() => setNotice(''), 2400);
    } catch (err) {
      setError(err.message);
    }
  }

  function openCreate() {
    setModalTask(null);
    setModalOpen(true);
  }

  function openEdit(task) {
    setModalTask(task);
    setModalOpen(true);
  }

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#" aria-label="To Do List início"><span className="brand-mark">to<span>*</span></span><span className="brand-dot">do.</span></a>
        <span className="topbar-caption">MAKE SPACE FOR WHAT MATTERS</span>
        <div className="topbar-status"><span className="status-dot" /> YOUR SPACE</div>
      </header>

      <section className="workspace">
        <div className="intro">
          <span className="eyebrow"><span className="eyebrow-line" /> YOUR PERSONAL WORKSPACE</span>
          <h1>One thing at<br /><span>a time.</span></h1>
          <p>Small steps make a big difference.<br />Let's make today count.</p>
        </div>

        <section className="task-panel" aria-label="Lista de tarefas">
          <div className="panel-header">
            <div>
              <span className="eyebrow">YOUR DAY, YOUR PACE</span>
              <h2>Task List<span className="title-period">.</span></h2>
            </div>
            <div className="total-bubble"><span>{tasks.length.toString().padStart(2, '0')}</span><small>TASKS</small></div>
          </div>

          <div className="search-wrap">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label="Buscar tarefas"
              placeholder="Search your tasks..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && <button className="clear-search" onClick={() => setQuery('')} aria-label="Limpar busca"><X size={16} /></button>}
            <kbd>⌘ K</kbd>
          </div>

          <div className="list-meta">
            <span>{query ? 'SEARCH RESULTS' : 'YOUR TASKS'}</span>
            <span>{pendingCount} PENDING <i /> {completedCount} DONE</span>
          </div>

          {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => loadTasks(debouncedQuery)}>Retry</button></div>}
          {notice && <div className="notice" role="status">{notice}</div>}

          <div className="tasks-list">
            {loading ? (
              <div className="loading-state"><span className="spinner" /> Loading your tasks...</div>
            ) : sortedTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><CirclePlus size={25} strokeWidth={1.5} /></div>
                <p>You have no pending tasks.</p>
                <span>{query ? 'Try another search or create a new task.' : 'A clear space is a fresh start.'}</span>
                <button onClick={openCreate}>Create your first task <Plus size={15} /></button>
              </div>
            ) : sortedTasks.map((task) => {
              const overdue = isOverdue(task);
              return (
                <article className={`task-row ${task.completed ? 'is-completed' : ''}`} key={task.id}>
                  <button
                    className={`task-check ${task.completed ? 'checked' : ''}`}
                    onClick={() => toggleTask(task)}
                    aria-label={task.completed ? `Marcar ${task.title} como pendente` : `Marcar ${task.title} como concluída`}
                    aria-pressed={task.completed}
                  >{task.completed && <Check size={14} strokeWidth={3} />}</button>
                  <div className="task-copy">
                    <span className={`task-title ${overdue ? 'overdue' : ''}`}>{task.title}</span>
                    <div className="task-subline">
                      {task.dueDate && <span className={`due-date ${overdue ? 'due-overdue' : ''}`}><CalendarDays size={12} /> {formatDate(task.dueDate)}</span>}
                      {overdue && <span className="overdue-badge">Em atraso</span>}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button className="icon-button edit-action" onClick={() => openEdit(task)} aria-label={`Editar ${task.title}`} title="Editar"><Pencil size={16} /></button>
                    <button className="icon-button delete-action" onClick={() => deleteTask(task)} aria-label={`Excluir ${task.title}`} title="Excluir"><Trash2 size={16} /></button>
                  </div>
                </article>
              );
            })}
          </div>

          <footer className="panel-footer">
            <div className="progress-label"><span>DAILY PROGRESS</span><strong>{tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%</strong></div>
            <div className="progress-track"><span style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }} /></div>
            <div className="footer-counts"><span><b>{completedCount}</b> completed</span><span><b>{pendingCount}</b> remaining</span></div>
          </footer>
        </section>
      </section>

      <div className="page-foot"><span>FOCUS ON WHAT'S NEXT.</span><span>ONE TASK AT A TIME <i>✳</i></span></div>

      <button className="floating-add" onClick={openCreate} aria-label="Criar nova tarefa" title="Create task"><Plus size={25} strokeWidth={2.2} /></button>

      {modalOpen && <TaskModal task={modalTask} onClose={() => { setModalOpen(false); setModalTask(null); }} onSave={saveTask} saving={saving} />}
    </main>
  );
}
