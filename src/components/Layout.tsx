import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Layout.module.css';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isAuthPage = pathname === '/' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isLoginSplit = !user && isAuthPage;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (pathname === '/' && token) {
      navigate(`/reset-password?token=${encodeURIComponent(token)}`, { replace: true });
    }
  }, [pathname, location.search, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (isLoginSplit) {
    return (
      <div className={styles.splitLayout}>
        <div className={styles.splitBrand}>
          <div className={styles.splitBrandContent}>
            <h1 className={styles.splitBrandTitle}>Bookshelf</h1>
            <p className={styles.splitBrandTagline}>Read anytime, anywhere.</p>
          </div>
        </div>
        <div className={styles.splitForm}>
          <div className={styles.splitFormInner}>
            <Outlet />
          </div>
          <div className={styles.splitFormLinks}>
            <span className={styles.poweredBy}>Powered by AG</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          Bookshelf
        </Link>
        <nav className={styles.nav}>
          {user ? (
            <>
              <Link to="/">Dashboard</Link>
              <Link to="/shelves">My Shelves</Link>
              <Link to="/books/new">Add Book</Link>
              <Link to="/search">Search</Link>
              <span className={styles.userName}>{user.name}</span>
              <Link to="/profile">Profile</Link>
              {user.email === 'demo@bookshelf.app' && <Link to="/users">Users</Link>}
              <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/">Log in</Link>
              <Link to="/register">Sign up</Link>
            </>
          )}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
