import { Link } from 'react-router-dom';
import type { Book } from '../types';
import { STATUS_LABELS } from '../types';
import { Rating } from './Rating';
import { Progress } from './Progress';
import styles from './BookCard.module.css';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : String(book.authors ?? '');

  return (
    <article className={styles.card}>
      <Link to={`/books/${book.id}`} className={styles.link}>
        <div className={styles.cover}>
          {book.cover_url ? (
            <img src={book.cover_url} alt="" />
          ) : (
            <div className={styles.coverPlaceholder}>
              <span>{book.title.slice(0, 2).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className={styles.body}>
          <span className={styles.status}>{STATUS_LABELS[book.status]}</span>
          <h3 className={styles.title}>{book.title}</h3>
          {authors && <p className={styles.authors}>{authors}</p>}
          <Rating value={book.rating} readonly size="small" />
          <Progress
            current={book.current_page}
            total={book.total_pages}
            startDate={book.start_date}
            endDate={book.end_date}
          />
        </div>
      </Link>
    </article>
  );
}
