import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { booksApi, shelvesApi } from '../api/client';
import { BookCard } from '../components/BookCard';
import { SearchBar } from '../components/SearchBar';
import { Filters } from '../components/Filters';
import styles from './Search.module.css';

export function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const shelfId = searchParams.get('shelfId') ? parseInt(searchParams.get('shelfId')!, 10) : undefined;
  const sort = searchParams.get('sort') ?? 'recently_added';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const { data: shelvesData } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => shelvesApi.list(),
  });
  const shelfOptions = shelvesData?.shelves ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['books', { search: q, status, tag, shelfId, sort, page }],
    queryFn: () => booksApi.list({ search: q, status, tag, shelfId, sort, page, limit: 24 }),
  });

  const books = data?.books ?? [];
  const total = data?.total ?? 0;

  return (
    <div className={styles.page}>
      <h1>Search your library</h1>
      <div className={styles.searchWrap}>
        <SearchBar defaultValue={q} />
      </div>
      <Filters showShelfFilter showTagFilter shelfOptions={shelfOptions} />
      {isLoading ? (
        <p className={styles.loading}>Searching…</p>
      ) : q ? (
        <>
          <p className={styles.resultCount}>
            {total} result{total !== 1 ? 's' : ''} for “{q}”
          </p>
          {books.length === 0 ? (
            <p className={styles.noResults}>No books match your search.</p>
          ) : (
            <div className={styles.grid}>
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className={styles.hint}>Enter a search term (title, author, or tag) above.</p>
      )}
    </div>
  );
}
