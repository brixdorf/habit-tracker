import { useState } from 'react';
import { Logo } from '../components/common/Logo.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useTheme();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base-50 px-4 dark:bg-base-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold text-base-900 dark:text-base-100">Habit Tracker</h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-base-200 bg-base-100 p-6 shadow-sm dark:border-base-800 dark:bg-base-900"
        >
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-base-700 dark:text-base-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full rounded-md border border-base-300 bg-base-50 px-3 py-2 text-base-900 outline-none focus:border-accent-500 dark:border-base-700 dark:bg-base-950 dark:text-base-100"
            />
          </div>
          <div className="mb-5">
            <label className="mb-1 block text-sm font-medium text-base-700 dark:text-base-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-base-300 bg-base-50 px-3 py-2 text-base-900 outline-none focus:border-accent-500 dark:border-base-700 dark:bg-base-950 dark:text-base-100"
            />
          </div>
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-accent-500 px-3 py-2 font-medium text-base-50 transition hover:bg-accent-600 disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
