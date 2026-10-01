import { vi } from 'vitest';

export function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

// Replaces fetch with a handler that receives (method, pathWithQuery, body).
// Plain return values become 200 JSON responses; undefined becomes a 404.
export function stubApi(handler) {
  const fetchMock = vi.fn(async (url, options = {}) => {
    const parsed = new URL(url, 'http://localhost');
    const method = options.method ?? 'GET';
    const body = options.body ? JSON.parse(options.body) : undefined;
    const result = await handler(method, parsed.pathname + parsed.search, body);
    if (result instanceof Response) return result;
    if (result === undefined) return jsonResponse(404, { error: `Unhandled ${method} ${parsed.pathname}` });
    return jsonResponse(200, result);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export function habit(overrides) {
  return {
    id: 1,
    name: 'Habit',
    color: 'hsl(0, 42%, 48%)',
    position: 1,
    createdDate: '2026-10-01',
    archivedDate: null,
    goal: 20,
    storedGoal: 20,
    achieved: 0,
    checkedDates: [],
    cutoffDate: null,
    fullyDisabled: false,
    ...overrides,
  };
}
