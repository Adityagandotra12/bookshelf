import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '../api/client';
import { BookForm, type BookFormValues } from '../components/BookForm';
import styles from './AddBook.module.css';

export function AddBook() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: BookFormValues) => booksApi.create(values),
    onSuccess: (book) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      navigate('/', { state: { bookJustAdded: true, bookId: book.id }, replace: true });
    },
  });

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroIcon} aria-hidden="true">📖</div>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Add Book</h1>
          <p className={styles.heroSubtitle}>
            Fill in the details below to add a new title to your library.
          </p>
        </div>
        <div className={styles.heroOrb} aria-hidden="true" />
      </div>

      <div className={styles.formCard}>
        <div className={styles.formCardHeader}>
          <h2 className={styles.formCardTitle}>Book details</h2>
          <p className={styles.formCardHint}>Title and at least one author are required.</p>
        </div>
        <BookForm
          submitLabel="Add Book"
          isLoading={mutation.isPending}
          onSubmit={async (values) => {
            await mutation.mutateAsync(values);
          }}
        />
        {mutation.isError && (
          <p className={styles.error} role="alert">
            {mutation.error instanceof Error ? mutation.error.message : 'Failed to add book'}
          </p>
        )}
      </div>
    </div>
  );
}
