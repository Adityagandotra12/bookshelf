import { useAuth } from '../store/hooks/useAuth';
import { Login } from './Login';
import { Dashboard } from './Dashboard';

/**
 * First page: show Login when not logged in, Dashboard after login.
 */
export function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <Dashboard />;
}
