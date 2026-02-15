import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import styles from './Auth.module.css';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email, typeof window !== 'undefined' ? window.location.origin : undefined);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.message}>
            If an account exists for that email, we’ve sent you a link to reset your password.
          </p>
          <p className={styles.message}>
            <strong>Don’t see the email?</strong> Check your spam or promotions folder. If you’re running the app locally and didn’t set up email (SMTP), the reset link was printed in the <strong>server terminal</strong> — copy that link and open it in your browser.
          </p>
          <Link to="/" className={styles.link}>Back to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Forgot password</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className={styles.footer}>
          <Link to="/">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
