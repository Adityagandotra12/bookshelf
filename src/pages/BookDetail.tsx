import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi, shelvesApi } from '../api/client';
import { BookForm, type BookFormValues } from '../components/BookForm';
import { Rating } from '../components/Rating';
import { Progress } from '../components/Progress';
import { STATUS_LABELS } from '../types';
import type { Book } from '../types';
import styles from './BookDetail.module.css';

export function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const id = parseInt(bookId ?? '0', 10);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.get(id),
    enabled: id > 0,
  });

  const { data: shelvesData } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => shelvesApi.list(),
  });
  const { data: bookShelvesData } = useQuery({
    queryKey: ['book', id, 'shelves'],
    queryFn: () => booksApi.getBookShelves(id),
    enabled: id > 0,
  });
  const shelfIdsOnBook = bookShelvesData?.shelfIds ?? [];
  const allShelves = shelvesData?.shelves ?? [];
  const shelvesNotOn = allShelves.filter((s) => !shelfIdsOnBook.includes(s.id));

  const addToShelfMutation = useMutation({
    mutationFn: (shelfId: number) => shelvesApi.addBook(shelfId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id, 'shelves'] });
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
  const removeFromShelfMutation = useMutation({
    mutationFn: (shelfId: number) => shelvesApi.removeBook(shelfId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id, 'shelves'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: BookFormValues) => booksApi.update(id, values as Partial<Book>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book', id] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => booksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      navigate('/');
    },
  });

  if (isLoading || !book) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Loading book…</p>
      </div>
    );
  }

  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : String(book.authors ?? '');

  if (editing) {
    return (
      <div className={styles.page}>
        <h1>Edit book</h1>
        <BookForm
          defaultValues={book}
          submitLabel="Save changes"
          isLoading={updateMutation.isPending}
          onSubmit={async (values) => {
            await updateMutation.mutateAsync(values);
            setEditing(false);
          }}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className={styles.cancelBtn}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.cover}>
          {book.cover_url ? (
            <img src={book.cover_url} alt="" />
          ) : (
            <div className={styles.coverPlaceholder}>
              {book.title.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className={styles.meta}>
          <span className={styles.status}>{STATUS_LABELS[book.status]}</span>
          <h1 className={styles.title}>{book.title}</h1>
          {authors && <p className={styles.authors}>{authors}</p>}
          {(book.publisher || book.year) && (
            <p className={styles.publisher}>
              {[book.publisher, book.year].filter(Boolean).join(' · ')}
            </p>
          )}
          {book.category && <p className={styles.category}>{book.category}</p>}
          {book.tags?.length > 0 && (
            <div className={styles.tags}>
              {book.tags.map((t) => (
                <span key={t} className={styles.tag}>{t}</span>
              ))}
            </div>
          )}
          <div className={styles.ratingWrap}>
            <Rating value={book.rating} readonly size="medium" />
          </div>
          <Progress
            current={book.current_page}
            total={book.total_pages}
            startDate={book.start_date}
            endDate={book.end_date}
          />
          {book.description_notes && (
            <div className={styles.notes}>
              <h3>Notes</h3>
              <p>{book.description_notes}</p>
            </div>
          )}
          <div className={styles.shelvesSection}>
            <h3>Shelves</h3>
            {shelfIdsOnBook.length > 0 && (
              <p className={styles.shelvesList}>
                On: {shelfIdsOnBook.map((sid) => {
                  const s = allShelves.find((x) => x.id === sid);
                  return s ? (
                    <span key={s.id} className={styles.shelfChip}>
                      <Link to={`/shelves/${s.id}`}>{s.name}</Link>
                      <button
                        type="button"
                        className={styles.removeShelf}
                        onClick={() => removeFromShelfMutation.mutate(s.id)}
                        disabled={removeFromShelfMutation.isPending}
                        title="Remove from shelf"
                      >
                        ×
                      </button>
                    </span>
                  ) : null;
                })}
              </p>
            )}
            {shelvesNotOn.length > 0 && (
              <div className={styles.addToShelfWrap}>
                <select
                  className={styles.shelfSelect}
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) addToShelfMutation.mutate(parseInt(v, 10));
                    e.target.value = '';
                  }}
                  disabled={addToShelfMutation.isPending}
                >
                  <option value="">Add to shelf…</option>
                  {shelvesNotOn.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => setEditing(true)} className={styles.editBtn}>
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this book?')) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className={styles.deleteBtn}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
            <Link to="/" className={styles.backLink}>Back to dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
