import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, dateUtils } from './helpers.js';

let client;
before(async () => {
  client = await startServer();
  await client.login();
});
after(() => client.close());

test('today endpoint reports the IST date and month', async () => {
  const res = await client.get('/api/meta/today');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { today: dateUtils.todayIST(), month: dateUtils.currentMonthIST() });
});
