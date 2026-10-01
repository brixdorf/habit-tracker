import bcrypt from 'bcryptjs';

// Must be set before any app module is imported, so the database opens in memory.
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.AUTH_USERNAME = 'tester';
process.env.AUTH_PASSWORD_HASH = bcrypt.hashSync('correct-password', 4);

export const USERNAME = 'tester';
export const PASSWORD = 'correct-password';

const { createApp } = await import('../src/app.js');
const { db } = await import('../src/db.js');
const dateUtils = await import('../src/dateUtils.js');

export { db, dateUtils };

export function resetData() {
  db.exec('DELETE FROM checks; DELETE FROM habit_goals; DELETE FROM notes; DELETE FROM habits;');
}

// Starts the app on a random port and returns a tiny fetch client that keeps the session cookie.
export async function startServer() {
  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';

  async function request(method, path, body) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(base + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await res.text();
    let data = text;
    try {
      data = JSON.parse(text);
    } catch {
      // leave non-JSON bodies as text
    }
    return { status: res.status, headers: res.headers, body: data };
  }

  const client = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    patch: (path, body) => request('PATCH', path, body),
    delete: (path) => request('DELETE', path),
    async login() {
      const res = await request('POST', '/api/auth/login', { username: USERNAME, password: PASSWORD });
      if (res.status !== 200) throw new Error(`login failed: ${res.status}`);
    },
    clearCookie() {
      cookie = '';
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
  return client;
}
