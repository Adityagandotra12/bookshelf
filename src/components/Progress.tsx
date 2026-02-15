import styles from './Progress.module.css';

interface ProgressProps {
  current: number | null;
  total: number | null;
  startDate?: string | null;
  endDate?: string | null;
}

export function Progress({ current, total, startDate, endDate }: ProgressProps) {
  const hasPages = current != null && total != null && total > 0;
  const pct = hasPages ? Math.min(100, Math.round((current / total) * 100)) : null;
  const start = startDate ? new Date(startDate).toLocaleDateString() : null;
  const end = endDate ? new Date(endDate).toLocaleDateString() : null;

  if (!hasPages && !start && !end) return null;

  return (
    <div className={styles.wrapper}>
      {hasPages && (
        <div className={styles.barWrap}>
          <div className={styles.bar} style={{ width: `${pct}%` }} />
          <span className={styles.label}>{current} / {total} ({pct}%)</span>
        </div>
      )}
      {(start || end) && (
        <div className={styles.dates}>
          {start && <span>Started: {start}</span>}
          {end && <span>Finished: {end}</span>}
        </div>
      )}
    </div>
  );
}
