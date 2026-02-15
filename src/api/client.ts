import type { Book, User, Shelf } from '../types';

const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('bookshelf_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch (networkErr) {
    const msg =
      networkErr instanceof TypeError && networkErr.message === 'Failed to fetch'
        ? 'Cannot connect to server. Start the backend with: cd server && npm run dev'
        : networkErr instanceof Error
          ? networkErr.message
          : 'Network error';
    throw new Error(msg);
  }

  const data = await res.json().catch(() => ({}));
  const body = (data && typeof data === 'object') ? (data as { message?: string; error?: string }) : {};

  if (!res.ok) {
    const message =
      (body && (body.message ?? body.error)) || `Request failed (${res.status})`;
    const err = new Error(String(message));
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    api<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => api<{ message: string }>('/auth/logout', { method: 'POST' }),
  forgotPassword: (email: string, origin?: string) =>
    api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email, ...(origin ? { origin } : {}) }),
    }),
  resetPassword: (body: { token: string; password: string }) =>
    api<{ message: string }>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  me: () => api<{ user: User }>('/auth/me'),
};

export interface BooksListParams {
  search?: string;
  status?: string;
  tag?: string;
  shelfId?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface BooksListResponse {
  books: Book[];
  total: number;
  page: number;
  limit: number;
  statusCounts?: Record<string, number>;
}

export const booksApi = {
  list: (params: BooksListParams = {}) => {
    const sp = new URLSearchParams();
    if (params.search) sp.set('search', params.search);
    if (params.status) sp.set('status', params.status);
    if (params.tag) sp.set('tag', params.tag);
    if (params.shelfId != null) sp.set('shelfId', String(params.shelfId));
    if (params.sort) sp.set('sort', params.sort);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return api<BooksListResponse>(`/books${q ? `?${q}` : ''}`);
  },
  get: (id: number) => api<Book>(`/books/${id}`),
  getBookShelves: (id: number) => api<{ shelfIds: number[] }>(`/books/${id}/shelves`),
  create: (body: Partial<Book> & { title: string }) =>
    api<Book>('/books', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<Book>) =>
    api<Book>(`/books/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) =>
    api<void>(`/books/${id}`, { method: 'DELETE' }),
};

export const shelvesApi = {
  list: () => api<{ shelves: Shelf[] }>('/shelves'),
  create: (name: string) =>
    api<Shelf>('/shelves', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: number, name: string) =>
    api<Shelf>(`/shelves/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  delete: (id: number) => api<void>(`/shelves/${id}`, { method: 'DELETE' }),
  addBook: (shelfId: number, bookId: number) =>
    api<{ message: string }>(`/shelves/${shelfId}/books/${bookId}`, { method: 'POST' }),
  removeBook: (shelfId: number, bookId: number) =>
    api<void>(`/shelves/${shelfId}/books/${bookId}`, { method: 'DELETE' }),
};

export interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export const usersApi = {
  getProfile: () => api<{ user: User & { created_at?: string } }>('/users/profile'),
  updateProfile: (body: { name?: string; password?: string }) =>
    api<{ user: User }>('/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
  /** Admin only: list all users (new signups). */
  listUsers: () => api<{ users: UserRow[] }>('/users/list'),
  deleteUser: (id: number) =>
    api<{ message: string }>(`/users/${id}`, { method: 'DELETE' }),
};
