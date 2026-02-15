import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../api/client';
import styles from './Profile.module.css';

export function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; password?: string }) => usersApi.updateProfile(body),
    onSuccess: (data) => {
      setUser(data.user);
      setMessage('Profile updated.');
      setPassword('');
      setConfirmPassword('');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    updateMutation.mutate({
      name: name.trim() || undefined,
      password: password || undefined,
    });
  };

  if (!user) return null;

  return (
    <div className={styles.page}>
      <h1>Profile &amp; settings</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        {message && <div className={styles.message}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={user.email} disabled className={styles.disabled} />
          <span className={styles.hint}>Email cannot be changed.</span>
        </div>
        <div className={styles.field}>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">New password (leave blank to keep current)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <button type="submit" disabled={updateMutation.isPending} className={styles.button}>
          {updateMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
