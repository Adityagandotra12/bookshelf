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
      <h1>Add a book</h1>
      <p className={styles.subtitle}>Enter the book details below. Title and at least one author are required.</p>
      <BookForm
        submitLabel="Add book"
        isLoading={mutation.isPending}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values);
        }}
      />
      {mutation.isError && (
        <p className={styles.error}>{mutation.error instanceof Error ? mutation.error.message : 'Failed to add book'}</p>
      )}
    </div>
  );
}
