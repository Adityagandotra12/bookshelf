import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi, shelvesApi } from '../api/client';
import { BookCard } from '../components/BookCard';
import { Filters } from '../components/Filters';
import styles from './ShelfDetail.module.css';

export function ShelfDetail() {
  const { shelfId } = useParams<{ shelfId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const id = parseInt(shelfId ?? '0', 10);

  const { data: shelvesData } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => shelvesApi.list(),
  });

  const shelf = shelvesData?.shelves?.find((s) => s.id === id);

  const deleteMutation = useMutation({
    mutationFn: () => shelvesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      navigate('/shelves');
    },
  });

  const handleDeleteShelf = () => {
    if (!shelf || shelf.is_default) return;
    if (!window.confirm(`Delete shelf "${shelf.name}"? Books will be removed from this shelf only (they stay in your library).`)) return;
    deleteMutation.mutate();
  };

  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const sort = searchParams.get('sort') ?? 'recently_added';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const { data, isLoading } = useQuery({
    queryKey: ['books', { shelfId: id, status, sort, page }],
    queryFn: () => booksApi.list({ shelfId: id, status, sort, page, limit: 24 }),
    enabled: id > 0,
  });

  const books = data?.books ?? [];
  const total = data?.total ?? 0;
  const shelfOptions = shelvesData?.shelves ?? [];

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb}>
        <Link to="/shelves">Shelves</Link>
        <span className={styles.sep}>/</span>
        <span>{shelf?.name ?? 'Shelf'}</span>
      </nav>
      <h1>{shelf?.name ?? 'Shelf'}</h1>
      <p className={styles.subtitle}>
        {total} book{total !== 1 ? 's' : ''} on this shelf.
      </p>
      {shelf && !shelf.is_default && (
        <p className={styles.actions}>
          <button
            type="button"
            className={styles.deleteShelfBtn}
            onClick={handleDeleteShelf}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting…' : 'Delete this shelf'}
          </button>
        </p>
      )}
      <Filters
        shelfId={id}
        shelfOptions={shelfOptions}
        showShelfFilter={false}
      />
      {isLoading ? (
        <p className={styles.loading}>Loading…</p>
      ) : books.length === 0 ? (
        <div className={styles.empty}>
          <p>No books on this shelf yet.</p>
          <Link to="/books/new">Add a book</Link>
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
