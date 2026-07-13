import { useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../store/hooks/useAuth';
import { booksApi, shelvesApi } from '../api/client';
import { BookCard } from '../components/BookCard';
import { SearchBar } from '../components/SearchBar';
import { Filters } from '../components/Filters';
import type { BookStatus } from '../types';
import styles from './Dashboard.module.css';

const STAT_CONFIG: { key: BookStatus; label: string; color: string; icon: string }[] = [
  { key: 'to_read', label: 'To Read', color: 'statBlue', icon: '📋' },
  { key: 'reading', label: 'Reading', color: 'statPurple', icon: '📖' },
  { key: 'completed', label: 'Completed', color: 'statGreen', icon: '✅' },
  { key: 'dropped', label: 'Dropped', color: 'statGray', icon: '🔖' },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const shelfId = searchParams.get('shelfId') ? parseInt(searchParams.get('shelfId')!, 10) : undefined;
  const sort = searchParams.get('sort') ?? 'recently_added';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  useEffect(() => {
    if (searchParams.has('status') || searchParams.has('shelfId') || searchParams.has('tag')) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('status');
        next.delete('shelfId');
        next.delete('tag');
        next.delete('page');
        return next;
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: shelvesData } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => shelvesApi.list(),
  });
  const shelfOptions = shelvesData?.shelves ?? [];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['books', { search, status, tag, shelfId, sort, page, limit: 12 }],
    queryFn: () => booksApi.list({ search, status, tag, shelfId, sort, page, limit: 12 }),
    refetchOnMount: 'always',
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const bookJustAdded = (location.state as { bookJustAdded?: boolean; bookId?: number } | null)?.bookJustAdded ?? false;

  const books = data?.books ?? [];
  const total = data?.total ?? 0;
  const statusCounts = data?.statusCounts ?? { to_read: 0, reading: 0, completed: 0, dropped: 0 };
  const hasFilters = status !== '' || shelfId != null || tag !== '';

  const clearFilters = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('status');
      next.delete('shelfId');
      next.delete('tag');
      next.delete('page');
      return next;
    });
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Reader';

  return (
    <div className={styles.page}>
      {user?.role === 'admin' && (
        <div className={styles.adminHint}>
          You're logged in as an administrator. View all users → <Link to="/users">Users</Link>
        </div>
      )}

      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroGreeting}>{getGreeting()}, {firstName} 👋</p>
          <h1 className={styles.heroTitle}>Your personal library</h1>
          <p className={styles.heroSubtitle}>
            {total > 0
              ? `You have ${total} book${total !== 1 ? 's' : ''} across your shelves. Keep reading!`
              : 'Start building your collection — every great reader begins with one book.'}
          </p>
        </div>
        <Link to="/books/new" className={styles.heroBtn}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Book
        </Link>
        <div className={styles.heroOrb1} aria-hidden="true" />
        <div className={styles.heroOrb2} aria-hidden="true" />
      </div>

      {bookJustAdded && (
        <div className={styles.successBanner} role="status">
          <span className={styles.successIcon}>🎉</span>
          Book added successfully — it appears in the list below.
        </div>
      )}

      {total > 0 && (
        <div className={styles.statsGrid}>
          {STAT_CONFIG.map(({ key, label, color, icon }) => (
            <div key={key} className={`${styles.statCard} ${styles[color]}`}>
              <span className={styles.statIcon} aria-hidden="true">{icon}</span>
              <div className={styles.statBody}>
                <span className={styles.statValue}>{statusCounts[key] ?? 0}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.toolbar}>
        <SearchBar defaultValue={search} />
        <Filters showShelfFilter showTagFilter shelfOptions={shelfOptions} />
        {hasFilters && (
          <button type="button" onClick={clearFilters} className={styles.clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner} aria-hidden="true" />
          <p>Loading your books…</p>
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <p className={styles.errorText}>
            Could not load your books. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
          <div className={styles.emptyActions}>
            <button type="button" onClick={() => refetch()} className={styles.addBtn}>Retry</button>
            <Link to="/books/new" className={styles.addBtnSecondary}>Add Book</Link>
          </div>
        </div>
      ) : books.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIllustration} aria-hidden="true">
            <span className={styles.emptyBook}>📚</span>
            <span className={styles.emptySparkle}>✨</span>
          </div>
          <p className={styles.emptyTitle}>Your shelf is waiting</p>
          <p className={styles.emptyText}>Add your first book and start tracking your reading journey.</p>
          <Link to="/books/new" className={styles.addBtn}>Add your first book</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {books.map((book, i) => (
            <div key={book.id} className={styles.gridItem} style={{ animationDelay: `${i * 50}ms` }}>
              <BookCard book={book} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
