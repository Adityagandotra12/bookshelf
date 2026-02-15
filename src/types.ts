export type BookStatus = 'to_read' | 'reading' | 'completed' | 'dropped';

export interface Book {
  id: number;
  user_id: number;
  title: string;
  authors: string[];
  isbn: string | null;
  publisher: string | null;
  year: number | null;
  cover_url: string | null;
  category: string | null;
  tags: string[];
  description_notes: string | null;
  status: BookStatus;
  rating: number | null;
  total_pages: number | null;
  current_page: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shelf {
  id: number;
  user_id: number;
  name: string;
  is_default: number;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export const STATUS_LABELS: Record<BookStatus, string> = {
  to_read: 'To Read',
  reading: 'Reading',
  completed: 'Completed',
  dropped: 'Dropped',
};
