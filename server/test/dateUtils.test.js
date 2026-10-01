import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  todayIST,
  currentMonthIST,
  daysInMonth,
  monthToDates,
  addMonths,
  weekdayAbbrev,
} from '../src/dateUtils.js';

test('today is computed in IST regardless of the machine timezone', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-01-31T19:00:00Z') });
  // 19:00 UTC is 00:30 the next day in IST (UTC+5:30).
  assert.equal(todayIST(), '2026-02-01');
  assert.equal(currentMonthIST(), '2026-02');

  t.mock.timers.setTime(Date.parse('2026-01-31T18:29:59Z'));
  assert.equal(todayIST(), '2026-01-31');
});

test('month helpers', () => {
  assert.equal(daysInMonth('2024-02'), 29);
  assert.equal(daysInMonth('2026-02'), 28);
  assert.equal(daysInMonth('2026-12'), 31);
  assert.deepEqual(monthToDates('2026-02').slice(0, 2), ['2026-02-01', '2026-02-02']);
  assert.equal(monthToDates('2026-02').length, 28);
  assert.equal(addMonths('2026-12', 1), '2027-01');
  assert.equal(addMonths('2026-01', -1), '2025-12');
  assert.equal(weekdayAbbrev('2026-10-01'), 'Thu');
});

