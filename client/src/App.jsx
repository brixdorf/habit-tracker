import { useAuth } from './contexts/AuthContext.jsx';
import { Login } from './pages/Login.jsx';
import { Dashboard } from './pages/Dashboard.jsx';

export default function App() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-50 dark:bg-base-950">
        <p className="text-base-500 dark:text-base-400">Loading…</p>
      </div>
    );
  }

  return authenticated ? <Dashboard /> : <Login />;
}
