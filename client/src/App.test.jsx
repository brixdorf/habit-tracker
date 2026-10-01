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
