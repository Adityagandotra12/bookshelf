import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Book, BookStatus } from '../types';
import { Rating } from './Rating';
import styles from './BookForm.module.css';

const statusOptions: BookStatus[] = ['to_read', 'reading', 'completed', 'dropped'];

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  authors: z
    .string()
    .min(1, 'At least one author')
    .refine((s) => s.split(',').map((a) => a.trim()).filter(Boolean).length >= 1, 'At least one author is required'),
  isbn: z.string().max(20).optional().or(z.literal('')),
  publisher: z.string().max(255).optional().or(z.literal('')),
  year: z.coerce.number().int().min(0).max(2100).optional().nullable(),
  cover_url: z.string().optional().refine((v) => !v || z.string().url().safeParse(v).success, 'Invalid URL').or(z.literal('')),
  category: z.string().max(100).optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  description_notes: z.string().optional().or(z.literal('')),
  status: z.enum(['to_read', 'reading', 'completed', 'dropped']),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  total_pages: z.coerce.number().int().min(0).optional().nullable(),
  current_page: z.coerce.number().int().min(0).optional().nullable(),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
});

export type BookFormInput = z.infer<typeof schema>;

export type BookFormValues = Omit<BookFormInput, 'authors' | 'tags'> & {
  authors: string[];
  tags: string[];
};

function toApiValues(data: BookFormInput): BookFormValues {
  return {
    ...data,
    authors: data.authors.split(',').map((a) => a.trim()).filter(Boolean),
    tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
  };
}

interface BookFormProps {
  defaultValues?: Partial<Book>;
  onSubmit: (data: BookFormValues) => void | Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

function bookToFormValues(b?: Partial<Book>): Partial<BookFormInput> {
  if (!b) return { status: 'to_read' };
  const authorsStr = Array.isArray(b.authors) ? b.authors.join(', ') : (b.authors as string | undefined) ?? '';
  const tagsStr = Array.isArray(b.tags) ? b.tags.join(', ') : (b.tags as string | undefined) ?? '';
  return {
    title: b.title ?? '',
    authors: authorsStr,
    isbn: b.isbn ?? '',
    publisher: b.publisher ?? '',
    year: b.year ?? null,
    cover_url: b.cover_url ?? '',
    category: b.category ?? '',
    tags: tagsStr,
    description_notes: b.description_notes ?? '',
    status: b.status ?? 'to_read',
    rating: b.rating ?? null,
    total_pages: b.total_pages ?? null,
    current_page: b.current_page ?? null,
    start_date: b.start_date ?? '',
    end_date: b.end_date ?? '',
  };
}

export function BookForm({
  defaultValues,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save',
}: BookFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BookFormInput>({
    resolver: zodResolver(schema) as import('react-hook-form').Resolver<BookFormInput>,
    defaultValues: bookToFormValues(defaultValues),
  });

  const rating = watch('rating');

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form className={styles.form} onSubmit={handleSubmit((data: BookFormInput) => onSubmit(toApiValues(data)))}>
      {hasErrors && (
        <p className={styles.formError} role="alert">
          Please fix the errors below and try again.
        </p>
      )}
      <div className={styles.field}>
        <label htmlFor="title">Title *</label>
        <input id="title" {...register('title')} className={errors.title ? styles.error : ''} />
        {errors.title && <span className={styles.msg}>{errors.title.message}</span>}
      </div>
      <div className={styles.field}>
        <label htmlFor="authors">Authors * (comma-separated)</label>
        <input id="authors" {...register('authors')} placeholder="e.g. Jane Doe, John Smith" className={errors.authors ? styles.error : ''} />
        {errors.authors && <span className={styles.msg}>{errors.authors.message}</span>}
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label htmlFor="isbn">ISBN</label>
          <input id="isbn" {...register('isbn')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="category">Category / Genre</label>
          <input id="category" {...register('category')} />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label htmlFor="publisher">Publisher</label>
          <input id="publisher" {...register('publisher')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="year">Year</label>
          <input id="year" type="number" {...register('year')} className={errors.year ? styles.error : ''} />
          {errors.year && <span className={styles.msg}>{errors.year.message}</span>}
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="cover_url">Cover image URL</label>
        <input id="cover_url" type="url" {...register('cover_url')} placeholder="https://..." className={errors.cover_url ? styles.error : ''} />
        {errors.cover_url && <span className={styles.msg}>{errors.cover_url.message}</span>}
      </div>
      <div className={styles.field}>
        <label htmlFor="tags">Tags (comma-separated)</label>
        <input id="tags" {...register('tags')} placeholder="fiction, fantasy, 2026" />
      </div>
      <div className={styles.field}>
        <label htmlFor="description_notes">Description / Notes</label>
        <textarea id="description_notes" rows={3} {...register('description_notes')} />
      </div>
      <div className={styles.field}>
        <label>Status</label>
        <select {...register('status')} className={styles.select}>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s === 'to_read' ? 'To Read' : s === 'reading' ? 'Reading' : s === 'completed' ? 'Completed' : 'Dropped'}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label>Rating (1–5)</label>
        <Rating
          value={rating ?? null}
          onChange={(v) => setValue('rating', v)}
          readonly={false}
          size="medium"
        />
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label htmlFor="total_pages">Total pages</label>
          <input id="total_pages" type="number" min={0} {...register('total_pages')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="current_page">Current page</label>
          <input id="current_page" type="number" min={0} {...register('current_page')} />
        </div>
      </div>
      <div className={styles.row2}>
        <div className={styles.field}>
          <label htmlFor="start_date">Start date</label>
          <input id="start_date" type="date" {...register('start_date')} />
        </div>
        <div className={styles.field}>
          <label htmlFor="end_date">Finish date</label>
          <input id="end_date" type="date" {...register('end_date')} />
        </div>
      </div>
      <div className={styles.actions}>
        <button type="submit" disabled={isLoading} className={styles.submit}>
          {isLoading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
