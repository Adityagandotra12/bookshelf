import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../api/client';
import styles from './UsersList.module.css';

/**
 * Admin-only: shows where new signups (created users) are stored.
 */
export function UsersList() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.listUsers(),
  });

  const users = data?.users ?? [];
  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users-list'] }),
  });

  const handleDelete = (u: { id: number; name: string; email: string }) => {
    if (!window.confirm(`Delete user "${u.name}" (${u.email})? This cannot be undone.`)) return;
    deleteUserMutation.mutate(u.id);
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <p>Loading users…</p>
      </div>
    );
  }

  if (error) {
    const status = (error as Error & { status?: number }).status;
    const isForbidden = status === 403;
    return (
      <div className={styles.page}>
        <h1>All users</h1>
        <p className={styles.error}>
          {error instanceof Error ? error.message : 'Failed to load users.'}
        </p>
        {isForbidden ? (
          <div className={styles.adminHint}>
            <p>The user list is only visible to administrators. Your account does not have admin access.</p>
            <p>To view the list, your user must have <code>role = 'admin'</code> in the database. If you have database access, run:</p>
            <pre className={styles.code}>UPDATE users SET role = 'admin' WHERE email = 'your@email.com';</pre>
            <p className={styles.hint}>Replace <code>your@email.com</code> with your login email, then log out and log back in.</p>
          </div>
        ) : (
          <p className={styles.hint}>Only admins can view this page. If you are an admin, check the browser console or server logs for details.</p>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1>All users</h1>
      <p className={styles.subtitle}>
        New signups appear here. Users are stored in the <code>users</code> table in the database.
      </p>
      {deleteUserMutation.isError && (
        <p className={styles.error}>
          {deleteUserMutation.error instanceof Error ? deleteUserMutation.error.message : 'Failed to delete user.'}
        </p>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={styles.role}>{u.role}</span></td>
                <td>{new Date(u.created_at).toLocaleString()}</td>
                <td>
                  {currentUser?.id !== u.id && (
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(u)}
                      disabled={deleteUserMutation.isPending}
                      title="Delete user"
                    >
                      {deleteUserMutation.variables === u.id ? '…' : 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <p className={styles.empty}>No users yet.</p>}
    </div>
  );
}
