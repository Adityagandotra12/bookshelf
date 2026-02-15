-- Bookshelf database schema for MySQL

CREATE DATABASE IF NOT EXISTS bookshelf;
USE bookshelf;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('guest', 'user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(512) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shelves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  authors JSON NOT NULL COMMENT 'Array of author names',
  isbn VARCHAR(20) NULL,
  publisher VARCHAR(255) NULL,
  year INT NULL,
  cover_url VARCHAR(1024) NULL,
  category VARCHAR(100) NULL,
  tags JSON NOT NULL COMMENT 'Array of tag strings',
  description_notes TEXT NULL,
  status ENUM('to_read', 'reading', 'completed', 'dropped') NOT NULL DEFAULT 'to_read',
  rating TINYINT NULL CHECK (rating >= 1 AND rating <= 5),
  total_pages INT NULL,
  current_page INT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shelf_books (
  shelf_id INT NOT NULL,
  book_id INT NOT NULL,
  PRIMARY KEY (shelf_id, book_id),
  FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

CREATE INDEX idx_books_user_status ON books(user_id, status);
CREATE INDEX idx_books_user_created ON books(user_id, created_at);
CREATE INDEX idx_shelves_user ON shelves(user_id);
