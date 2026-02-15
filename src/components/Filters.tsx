import { useSearchParams } from 'react-router-dom';
import { STATUS_LABELS } from '../types';
import type { BookStatus } from '../types';
import styles from './Filters.module.css';

const SORT_OPTIONS = [
  { value: 'recently_added', label: 'Recently added' },
  { value: 'title', label: 'Title' },
  { value: 'author', label: 'Author' },
  { value: 'rating', label: 'Rating' },
  { value: 'progress', label: 'Progress' },
] as const;

interface FiltersProps {
  shelfId?: number | null;
  shelfOptions?: { id: number; name: string }[];
  showShelfFilter?: boolean;
  showTagFilter?: boolean;
}

export function Filters({
  shelfId,
  shelfOptions = [],
  showShelfFilter = false,
  showTagFilter = false,
}: FiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const tag = searchParams.get('tag') ?? '';
  const sort = searchParams.get('sort') ?? 'recently_added';
  const currentShelfId = searchParams.get('shelfId') ?? (shelfId != null ? String(shelfId) : '');

  const setFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete('page');
      return next;
    });
  };

  return (
    <div className={styles.filters}>
      <div className={styles.group}>
        <label htmlFor="filter-status" className={styles.label}>Status</label>
        <select
          id="filter-status"
          value={status}
          onChange={(e) => setFilter('status', e.target.value)}
          className={styles.select}
        >
          <option value="">All</option>
          {(Object.entries(STATUS_LABELS) as [BookStatus, string][]).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>
      {showShelfFilter && shelfOptions.length > 0 && (
        <div className={styles.group}>
          <label htmlFor="filter-shelf" className={styles.label}>Shelf</label>
          <select
            id="filter-shelf"
            value={currentShelfId}
            onChange={(e) => setFilter('shelfId', e.target.value)}
            className={styles.select}
          >
            <option value="">All shelves</option>
            {shelfOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      {showTagFilter && (
        <div className={styles.group}>
          <label htmlFor="filter-tag" className={styles.label}>Tag</label>
          <input
            id="filter-tag"
            type="text"
            value={tag}
            onChange={(e) => setFilter('tag', e.target.value)}
            placeholder="e.g. fiction"
            className={styles.tagInput}
          />
        </div>
      )}
      <div className={styles.group}>
        <label htmlFor="filter-sort" className={styles.label}>Sort by</label>
        <select
          id="filter-sort"
          value={sort}
          onChange={(e) => setFilter('sort', e.target.value)}
          className={styles.select}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
