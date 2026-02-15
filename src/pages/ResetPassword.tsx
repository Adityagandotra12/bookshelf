import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import styles from './Auth.module.css';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      setError('Missing reset token');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token: trimmedToken, password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Password reset</h1>
          <p className={styles.message}>Your password has been reset. You can now log in.</p>
          <Link to="/" className={styles.link}>Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} style={{ minHeight: '70vh' }}>
      <div className={styles.card}>
        <h1 className={styles.title}>Set new password</h1>
        {!token.trim() && (
          <div className={styles.error} style={{ marginBottom: '1rem' }}>
            <p><strong>No reset token in the URL.</strong></p>
            <p>If you clicked the link from your email:</p>
            <ul style={{ textAlign: 'left', margin: '0.5rem 0' }}>
              <li><strong>Opened on a different device (e.g. phone)?</strong> The link uses localhost and only works on the same computer where the app runs. Open the email on that computer and click the link again, or request a new reset from that computer.</li>
              <li><strong>Link didn’t open fully?</strong> Copy the <em>entire</em> link from the email (including <code>?token=...</code>) and paste it into this browser’s address bar.</li>
            </ul>
          </div>
        )}
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <label htmlFor="password">New password (min 8 characters)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <button type="submit" disabled={loading || !token.trim()} className={styles.button}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>
        <p className={styles.footer}>
          <Link to="/">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
