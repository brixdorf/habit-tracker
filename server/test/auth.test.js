import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, USERNAME, PASSWORD } from './helpers.js';

let client;
before(async () => {
  client = await startServer();
});
after(() => client.close());

test('auth flow: protected routes need a session, login grants one, logout revokes it', async () => {
  let res = await client.get('/api/auth/me');
  assert.deepEqual(res.body, { authenticated: false });

  for (const path of ['/api/habits?month=2026-01', '/api/notes?month=2026-01', '/api/export', '/api/meta/today']) {
    res = await client.get(path);
    assert.equal(res.status, 401, path);
  }

  res = await client.post('/api/auth/login', { username: USERNAME });
  assert.equal(res.status, 400);

  res = await client.post('/api/auth/login', { username: USERNAME, password: 'wrong' });
  assert.equal(res.status, 401);

  res = await client.post('/api/auth/login', { username: 'someone-else', password: PASSWORD });
  assert.equal(res.status, 401);

  res = await client.post('/api/auth/login', { username: USERNAME, password: PASSWORD });
  assert.equal(res.status, 200);

  res = await client.get('/api/auth/me');
  assert.deepEqual(res.body, { authenticated: true });
  res = await client.get('/api/habits?month=2026-01');
  assert.equal(res.status, 200);

  res = await client.post('/api/auth/logout');
  assert.equal(res.status, 200);
  res = await client.get('/api/auth/me');
  assert.deepEqual(res.body, { authenticated: false });
  res = await client.get('/api/habits?month=2026-01');
  assert.equal(res.status, 401);
});
