import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../store/hooks/useAuth';
import styles from './Layout.module.css';

const NAV_ITEMS: { to: string; label: string; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/shelves', label: 'Shelves' },
  { to: '/books/new', label: 'Add Book' },
  { to: '/search', label: 'Search' },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const isAuthPage = pathname === '/' || pathname === '/register' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isLoginSplit = !user && isAuthPage;

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    if (pathname === '/' && token) {
      navigate(`/reset-password?token=${encodeURIComponent(token)}`, { replace: true });
    }
  }, [pathname, location.search, navigate]);

  useEffect(() => {
    setMenuOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [profileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  if (isLoginSplit) {
    return (
      <div className={styles.splitLayout}>
        <div className={styles.splitBrand}>
          <div className={styles.splitBrandOrb1} aria-hidden="true" />
          <div className={styles.splitBrandOrb2} aria-hidden="true" />
          <div className={styles.splitBrandContent}>
            <span className={styles.splitBrandBadge}>Your personal library</span>
            <h1 className={styles.splitBrandTitle}>Bookshelf</h1>
            <p className={styles.splitBrandTagline}>
              Track what you read, rate your favorites, and build shelves that fit your life.
            </p>
            <ul className={styles.splitBrandFeatures}>
              <li><span className={styles.featureIcon}>📚</span> Organize books on custom shelves</li>
              <li><span className={styles.featureIcon}>📊</span> Track reading progress and ratings</li>
              <li><span className={styles.featureIcon}>🔎</span> Search your library instantly</li>
            </ul>
          </div>
        </div>
        <div className={styles.splitForm}>
          <div className={styles.splitFormInner}>
            <Outlet />
          </div>
          <div className={styles.splitFormLinks}>
            <span className={styles.poweredBy}>Powered by Gantryx</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <Link to="/" className={styles.logo}>
              <span className={styles.logoIcon} aria-hidden="true">📚</span>
              <span className={styles.logoText}>Bookshelf</span>
            </Link>

            {user && (
              <button
                type="button"
                className={styles.menuToggle}
                onClick={() => setMenuOpen((o) => !o)}
                aria-expanded={menuOpen}
                aria-label="Toggle navigation menu"
              >
                <span className={styles.menuBar} />
                <span className={styles.menuBar} />
                <span className={styles.menuBar} />
              </button>
            )}
          </div>

          <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`}>
            {user ? (
              <>
                <div className={styles.navLinks}>
                  {NAV_ITEMS.map(({ to, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                  {user.email === 'demo@bookshelf.app' && (
                    <NavLink
                      to="/users"
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                      }
                    >
                      Users
                    </NavLink>
                  )}
                </div>

                <div className={styles.navRight}>
                  <div className={styles.profileWrap} ref={profileRef}>
                    <button
                      type="button"
                      className={styles.profileBtn}
                      onClick={() => setProfileOpen((o) => !o)}
                      aria-expanded={profileOpen}
                      aria-haspopup="true"
                    >
                      <span className={styles.avatar} aria-hidden="true">
                        {getInitials(user.name)}
                      </span>
                      <span className={styles.profileInfo}>
                        <span className={styles.profileName}>{user.name}</span>
                        <span className={styles.profileEmail}>{user.email}</span>
                      </span>
                      <svg className={styles.chevron} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {profileOpen && (
                      <div className={styles.dropdown} role="menu">
                        <div className={styles.dropdownHeader}>
                          <span className={styles.dropdownAvatar}>{getInitials(user.name)}</span>
                          <div>
                            <p className={styles.dropdownName}>{user.name}</p>
                            <p className={styles.dropdownEmail}>{user.email}</p>
                          </div>
                        </div>
                        <div className={styles.dropdownDivider} />
                        <Link to="/profile" className={styles.dropdownItem} role="menuitem" onClick={() => setProfileOpen(false)}>
                          Profile &amp; settings
                        </Link>
                        <button type="button" className={styles.dropdownItemDanger} role="menuitem" onClick={handleLogout}>
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.navLinks}>
                <NavLink to="/" end className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}>
                  Log in
                </NavLink>
                <NavLink to="/register" className={({ isActive }) => `${styles.navLink} ${styles.navLinkCta} ${isActive ? styles.navLinkActive : ''}`}>
                  Sign up
                </NavLink>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
