import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shelvesApi } from '../api/client';
import styles from './Shelves.module.css';

export function Shelves() {
  const queryClient = useQueryClient();
  const [newShelfName, setNewShelfName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => shelvesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => shelvesApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      setNewShelfName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => shelvesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });

  const shelves = data?.shelves ?? [];

  const handleDeleteShelf = (shelf: { id: number; name: string; is_default: number }) => {
    if (shelf.is_default) return;
    if (!window.confirm(`Delete shelf "${shelf.name}"? Books on it will be removed from this shelf only (they stay in your library).`)) return;
    deleteMutation.mutate(shelf.id);
  };

  return (
    <div className={styles.page}>
      <h1>My Shelves</h1>
      <p className={styles.subtitle}>
        Organize your books into shelves. Default shelves (To Read, Reading, Completed) are created when you sign up. Create custom shelves (e.g. “Work”, “Fiction 2026”).
      </p>
      <div className={styles.createWrap}>
        <input
          type="text"
          className={styles.createInput}
          placeholder="New shelf name (e.g. Fiction 2026)"
          value={newShelfName}
          onChange={(e) => setNewShelfName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createMutation.mutate(newShelfName.trim()))}
        />
        <button
          type="button"
          className={styles.createBtn}
          onClick={() => createMutation.mutate(newShelfName.trim())}
          disabled={!newShelfName.trim() || createMutation.isPending}
        >
          {createMutation.isPending ? 'Creating…' : 'Create shelf'}
        </button>
        {createMutation.isError && (
          <span className={styles.error}>{createMutation.error instanceof Error ? createMutation.error.message : 'Failed'}</span>
        )}
      </div>
      {isLoading ? (
        <p className={styles.loading}>Loading shelves…</p>
      ) : (
        <ul className={styles.list}>
          {shelves.map((shelf) => (
            <li key={shelf.id} className={styles.item}>
              <Link to={`/shelves/${shelf.id}`} className={styles.link}>
                <span className={styles.name}>{shelf.name}</span>
                {shelf.is_default ? (
                  <span className={styles.badge}>Default</span>
                ) : null}
              </Link>
              {!shelf.is_default && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDeleteShelf(shelf);
                  }}
                  disabled={deleteMutation.isPending}
                  title={`Delete shelf "${shelf.name}"`}
                >
                  {deleteMutation.variables === shelf.id ? '…' : 'Delete'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
