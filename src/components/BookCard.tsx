import { Link } from 'react-router-dom';
import type { Book } from '../types';
import { STATUS_LABELS } from '../types';
import { Rating } from './Rating';
import { Progress } from './Progress';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
}

const STATUS_CLASS: Record<Book['status'], string> = {
  to_read: styles.statusToRead,
  reading: styles.statusReading,
  completed: styles.statusCompleted,
  dropped: styles.statusDropped,
};

export function BookCard({ book }: BookCardProps) {
  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : String(book.authors ?? '');

  return (
    <article className={styles.card}>
      <Link to={`/books/${book.id}`} className={styles.link}>
        <div className={styles.coverWrap}>
          <div className={styles.cover}>
            {book.cover_url ? (
              <img src={book.cover_url} alt="" loading="lazy" />
            ) : (
              <div className={styles.coverPlaceholder}>
                <span>{book.title.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>
          <span className={`${styles.status} ${STATUS_CLASS[book.status]}`}>
            {STATUS_LABELS[book.status]}
          </span>
        </div>
        <div className={styles.body}>
          <h3 className={styles.title}>{book.title}</h3>
          {authors && <p className={styles.authors}>{authors}</p>}
          {book.category && <span className={styles.category}>{book.category}</span>}
          <div className={styles.meta}>
            <Rating value={book.rating} readonly size="small" />
            <Progress
              current={book.current_page}
              total={book.total_pages}
              startDate={book.start_date}
              endDate={book.end_date}
            />
          </div>
        </div>
      </Link>
    </article>
  );
}
