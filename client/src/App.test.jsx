import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { stubApi, jsonResponse, deferred, habit } from './test/fakeApi.js';

function renderApp() {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  );
}

const loggedInRoutes = (overrides = {}) => (method, path, body) => {
  const override = overrides[`${method} ${path}`];
  if (override) return override(body);
  if (path === '/api/auth/me') return { authenticated: true };
  if (path === '/api/meta/today') return { today: '2026-10-01', month: '2026-10' };
  if (path.startsWith('/api/habits?')) return [];
  if (path.startsWith('/api/notes?')) return [];
  return undefined;
};

describe('App', () => {
  it('shows the login screen when not signed in', async () => {
    stubApi((method, path) => (path === '/api/auth/me' ? { authenticated: false } : undefined));
    renderApp();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows the dashboard for the current IST month when signed in', async () => {
    stubApi(loggedInRoutes({ 'GET /api/habits?month=2026-10': () => [habit({ name: 'Read' })] }));
    renderApp();
    expect(await screen.findByText('October 2026')).toBeInTheDocument();
    expect(await screen.findByText('Read')).toBeInTheDocument();
  });

  it('returns to the login screen when the session has expired', async () => {
    const unauthorized = () => jsonResponse(401, { error: 'Not authenticated.' });
    stubApi(
      loggedInRoutes({
        'GET /api/habits?month=2026-10': unauthorized,
        'GET /api/notes?month=2026-10': unauthorized,
      })
    );
    renderApp();
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows the month being viewed even when an earlier month loads last', async () => {
    const october = deferred();
    stubApi(
      loggedInRoutes({
        'GET /api/habits?month=2026-10': () => october.promise,
        'GET /api/habits?month=2026-11': () => [habit({ id: 2, name: 'November habit' })],
      })
    );
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', { name: 'Next month' }));
    expect(await screen.findByText('November habit')).toBeInTheDocument();

    october.resolve(jsonResponse(200, [habit({ id: 1, name: 'October habit' })]));
    await new Promise((r) => setTimeout(r, 20));

    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(screen.getByText('November habit')).toBeInTheDocument();
    expect(screen.queryByText('October habit')).not.toBeInTheDocument();
  });

  it('keeps the note draft and shows the error when adding a note fails', async () => {
    stubApi(loggedInRoutes({ 'POST /api/notes': () => jsonResponse(500, { error: 'Disk is full.' }) }));
    const user = userEvent.setup();
    renderApp();

    const input = await screen.findByPlaceholderText('Add a note for this month…');
    await user.type(input, 'Remember this');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(await screen.findByText('Disk is full.')).toBeInTheDocument();
    expect(input).toHaveValue('Remember this');
  });
});

describe('Full Month habits in the grid', () => {
  // Created on Oct 30, so October needs the 30th and 31st. The 5th was checked
  // before Full Month was turned on; it is kept but doesn't count.
  const fullMonthHabit = () =>
    habit({
      id: 7,
      name: 'Meditate',
      createdDate: '2026-10-30',
      fullMonth: true,
      startDate: '2026-10-30',
      goal: 2,
      storedGoal: 20,
      achieved: 1,
      checkedDates: ['2026-10-05', '2026-10-30'],
    });

  it('shows the required days as a fixed Full Month goal', async () => {
    stubApi(loggedInRoutes({ 'GET /api/habits?month=2026-10': () => [fullMonthHabit()] }));
    renderApp();

    const goal = await screen.findByLabelText('Full Month: every day, 2 days this month');
    expect(goal).toHaveTextContent('2');
    expect(goal.tagName).not.toBe('BUTTON');
  });

  it('locks days before the habit started', async () => {
    stubApi(loggedInRoutes({ 'GET /api/habits?month=2026-10': () => [fullMonthHabit()] }));
    renderApp();

    expect(await screen.findByRole('button', { name: 'Meditate on 2026-10-05, checked' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Meditate on 2026-10-29' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Meditate on 2026-10-31' })).toBeEnabled();
  });

  it('counts the month as achieved only once every required day is done', async () => {
    stubApi(
      loggedInRoutes({
        'GET /api/habits?month=2026-10': () => [fullMonthHabit()],
        'POST /api/habits/7/checks/2026-10-31/toggle': () => ({ checked: true }),
      })
    );
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByLabelText('1 of 2 done')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Meditate on 2026-10-31' }));
    expect(await screen.findByLabelText('2 of 2 done, goal met')).toBeInTheDocument();
  });

  it('sends the Full Month setting when creating and editing habits', async () => {
    const requests = [];
    stubApi(
      loggedInRoutes({
        'GET /api/habits?month=2026-10': () => [habit({ id: 3, name: 'Read', goal: 20, storedGoal: 20 })],
        'POST /api/habits': (body) => {
          requests.push(['POST', body]);
          return jsonResponse(201, { id: 4 });
        },
        'PATCH /api/habits/3': (body) => {
          requests.push(['PATCH', body]);
          return { ok: true };
        },
      })
    );
    const user = userEvent.setup();
    renderApp();
    // Wait for the list, or the click lands on the empty-state button that it replaces.
    await screen.findByText('Read');

    await user.click(screen.getByRole('button', { name: '+ New Habit' }));
    await user.type(screen.getByLabelText('Name'), 'Stretch');
    await user.click(screen.getByRole('checkbox', { name: /full month/i }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await user.click(await screen.findByRole('button', { name: 'Edit habit' }));
    await user.click(screen.getByRole('checkbox', { name: /full month/i }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await screen.findByText('Read');
    expect(requests).toEqual([
      ['POST', { name: 'Stretch', fullMonth: true }],
      ['PATCH', { name: 'Read', goal: 20, fullMonth: true, month: '2026-10' }],
    ]);
  });
});
