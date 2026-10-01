const BASE = '/api';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler = null;

// Lets the auth layer drop back to the login screen when the session expires mid-use.
export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function toApiError(res) {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    // ignore non-JSON error bodies
  }
  return new ApiError(message, res.status);
}

async function send(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });

  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) unauthorizedHandler?.();
    throw await toApiError(res);
  }
  return res;
}

async function request(path, options = {}) {
  const res = await send(path, options);
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

  // Returns the raw response so the caller can save the body as a file.
  exportData: () => send('/export'),
  importData: (snapshot) =>
    request('/import', { method: 'POST', body: JSON.stringify(snapshot) }),
};

export { ApiError };
