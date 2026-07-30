const BASE = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new ApiError(message, res.status);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

export const api = {
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  getToday: () => request('/meta/today'),

  getHabits: (month) => request(`/habits?month=${encodeURIComponent(month)}`),
  createHabit: (name, goal) =>
    request('/habits', { method: 'POST', body: JSON.stringify({ name, goal }) }),
  updateHabit: (id, patch) =>
    request(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  archiveHabit: (id) => request(`/habits/${id}/archive`, { method: 'POST' }),
  deleteHabit: (id) => request(`/habits/${id}`, { method: 'DELETE' }),
  reorderHabits: (orderedIds) =>
    request('/habits/reorder/all', { method: 'PATCH', body: JSON.stringify({ orderedIds }) }),
  toggleCheck: (habitId, date) =>
    request(`/habits/${habitId}/checks/${date}/toggle`, { method: 'POST' }),

  getNotes: (month) => request(`/notes?month=${encodeURIComponent(month)}`),
  createNote: (month, content) =>
    request('/notes', { method: 'POST', body: JSON.stringify({ month, content }) }),
  updateNote: (id, content) =>
    request(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),
  deleteNote: (id) => request(`/notes/${id}`, { method: 'DELETE' }),
  pinNote: (id, pinned) =>
    request(`/notes/${id}/pin`, { method: 'PATCH', body: JSON.stringify({ pinned }) }),
  reorderNotes: (month, pinned, orderedIds) =>
    request('/notes/reorder/group', {
      method: 'PATCH',
      body: JSON.stringify({ month, pinned, orderedIds }),
    }),

  exportData: () => fetch(`${BASE}/export`, { credentials: 'include' }),
  importData: (snapshot) =>
    request('/import', { method: 'POST', body: JSON.stringify(snapshot) }),
};

export { ApiError };
