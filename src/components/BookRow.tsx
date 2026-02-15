import { Link } from 'react-router-dom';
import type { Book } from '../types';
import { STATUS_LABELS } from '../types';
import { Rating } from './Rating';
import { Progress } from './Progress';
import styles from './BookRow.module.css';

interface BookRowProps {
  book: Book;
}

export function BookRow({ book }: BookRowProps) {
  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : String(book.authors ?? '');

  return (
    <tr className={styles.row}>
      <td className={styles.coverCell}>
        <Link to={`/books/${book.id}`} className={styles.coverLink}>
          {book.cover_url ? (
            <img src={book.cover_url} alt="" />
          ) : (
            <div className={styles.coverPlaceholder}>
              {book.title.slice(0, 2).toUpperCase()}
            </div>
          )}
        </Link>
      </td>
      <td>
        <Link to={`/books/${book.id}`} className={styles.titleLink}>
          {book.title}
        </Link>
        {authors && <div className={styles.authors}>{authors}</div>}
      </td>
      <td className={styles.status}>{STATUS_LABELS[book.status]}</td>
      <td>
        <Rating value={book.rating} readonly size="small" />
      </td>
      <td className={styles.progressCell}>
        <Progress
          current={book.current_page}
          total={book.total_pages}
          startDate={book.start_date}
          endDate={book.end_date}
        />
      </td>
    </tr>
  );
}
