import styles from './Rating.module.css';

interface RatingProps {
  value: number | null;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium';
}

const MAX = 5;

export function Rating({ value, onChange, readonly = false, size = 'medium' }: RatingProps) {
  const v = value ?? 0;

  const handleClick = (n: number) => {
    if (!readonly && onChange) onChange(n);
  };

  return (
    <div className={`${styles.rating} ${styles[size]}`} role={readonly ? 'img' : undefined} aria-label={readonly ? `Rating: ${v} out of ${MAX}` : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.star} ${n <= v ? styles.filled : ''}`}
          onClick={() => handleClick(n)}
          disabled={readonly}
          aria-label={readonly ? undefined : `Rate ${n} stars`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
