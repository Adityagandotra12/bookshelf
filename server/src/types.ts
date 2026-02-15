export type UserRole = 'guest' | 'user' | 'admin';

export interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: Date;
}

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
  created_at: Date;
  updated_at: Date;
}

export interface Shelf {
  id: number;
  user_id: number;
  name: string;
  is_default: number;
  created_at: Date;
}

export interface ShelfBook {
  shelf_id: number;
  book_id: number;
}

export interface JwtPayload {
  userId: number;
  email: string;
  role: UserRole;
}
