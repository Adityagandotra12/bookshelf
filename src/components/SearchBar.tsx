import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './SearchBar.module.css';

interface SearchBarProps {
  placeholder?: string;
  defaultValue?: string;
  onSearch?: (q: string) => void;
}

export function SearchBar({
  placeholder = 'Search by title, author, or tag…',
  defaultValue = '',
  onSearch,
}: SearchBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get('q') ?? defaultValue;
  const [value, setValue] = useState(urlQ);
  useEffect(() => {
    setValue(urlQ);
  }, [urlQ]);

  const submit = useCallback(
    (q: string) => {
      if (onSearch) {
        onSearch(q);
      } else {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          if (q.trim()) next.set('q', q.trim());
          else next.delete('q');
          next.delete('page');
          return next;
        });
      }
    },
    [onSearch, setSearchParams]
  );

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        submit(value);
      }}
    >
      <input
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search"
      />
      <button type="submit" className={styles.button}>
        Search
      </button>
    </form>
  );
}
