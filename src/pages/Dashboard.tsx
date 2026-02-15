import { useEffect } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { booksApi, shelvesApi } from '../api/client';
import { BookCard } from '../components/BookCard';
import { SearchBar } from '../components/SearchBar';
import { Filters } from '../components/Filters';
import styles from './Dashboard.module.css';

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

  // Default to showing all books when Dashboard loads (clear status/shelf filters)
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount to set default view

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

  return (
    <div className={styles.page}>
      {user?.role === 'admin' && (
        <div className={styles.adminHint}>
          You're logged in as an administrator. You can view all users in the app → <Link to="/users">Users</Link>
        </div>
      )}
      <div className={styles.header}>
        <h1>My books</h1>
        <p className={styles.subtitle}>
          Only your books are shown here. Track reading status, ratings, and progress.
        </p>
        {total > 0 && (
          <div className={styles.statusSummary}>
            <span>To Read: {statusCounts.to_read ?? 0}</span>
            <span>Reading: {statusCounts.reading ?? 0}</span>
            <span>Completed: {statusCounts.completed ?? 0}</span>
            <span>Dropped: {statusCounts.dropped ?? 0}</span>
          </div>
        )}
        <p className={styles.totalLine}>
          {total} book{total !== 1 ? 's' : ''} in your library
        </p>
        {bookJustAdded && (
          <p className={styles.justAdded} role="status">
            Book added. It appears in the list below.
          </p>
        )}
        <div className={styles.actions}>
          <SearchBar defaultValue={search} />
          <Link to="/books/new" className={styles.addBtn}>Add book</Link>
        </div>
        <Filters showShelfFilter showTagFilter shelfOptions={shelfOptions} />
        {hasFilters && (
          <button type="button" onClick={clearFilters} className={styles.clearFilters}>
            Show all statuses
          </button>
        )}
      </div>
      {isLoading ? (
        <p className={styles.loading}>Loading your books…</p>
      ) : error ? (
        <div className={styles.empty}>
          <p className={styles.errorText}>
            Could not load your books. {error instanceof Error ? error.message : 'Please try again.'}
          </p>
          <button type="button" onClick={() => refetch()} className={styles.addBtn}>Retry</button>
          <Link to="/books/new" className={styles.addBtn}>Add book</Link>
        </div>
      ) : books.length === 0 ? (
        <div className={styles.empty}>
          <p>No books yet. Every book you add will show up here — add your first book to get started.</p>
          <Link to="/books/new" className={styles.addBtn}>Add book</Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
