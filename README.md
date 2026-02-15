# Bookshelf System

A full-stack bookshelf app: manage your personal library, shelves, reading status, and progress.

## Features

- **Auth**: Sign up, login, logout, forgot/reset password
- **Books**: Add, edit, delete; title, authors, ISBN, publisher, year, category, tags, cover URL, notes
- **Status**: To Read / Reading / Completed / Dropped
- **Rating & progress**: 1–5 stars, current/total pages, start/finish dates
- **Shelves**: Default shelves (To Read, Reading, Completed) + custom shelves; move books between shelves
- **Search & filter**: By title, author, tag, status, shelf; sort by recent, title, author, rating, progress
- **Profile**: Update name and password

## Tech stack

- **Frontend**: React 19, TypeScript, Vite, React Router, TanStack Query, React Hook Form, Zod
- **Backend**: Node.js, Express, TypeScript, MySQL (mysql2), JWT, bcrypt, express-validator, helmet, CORS, rate limiting

## Prerequisites

- Node.js 18+
- MySQL 8+ (or MariaDB)

## Setup

### 1. Database

Create the database and tables:

```bash
mysql -u root -p < server/schema.sql
```

Or run the contents of `server/schema.sql` in your MySQL client. Ensure the database name matches `DB_NAME` in env (default: `bookshelf`).

### 2. Backend

```bash
cd server
cp .env.example .env
# Edit .env: set DB_PASSWORD, JWT_SECRET, etc.
npm install
npm run dev
```

API runs at **http://localhost:3001**.

**Optional – demo account:** From the `server` folder run `npm run seed` to create a demo user. Then log in with:
- **Email:** `demo@bookshelf.app`
- **Password:** `demo123`

### 3. Frontend

From the project root:

```bash
npm install
npm run dev
```

App runs at **http://localhost:5173** and proxies `/api` to the backend.

### 4. Password reset email (optional)

To send reset links to users' inboxes, configure Gmail in `server/.env` (see **server/EMAIL_AND_PASSWORD_RESET.md**).

### 5. Environment (backend)

| Variable     | Description           | Default        |
|-------------|------------------------|----------------|
| NODE_ENV    | Environment            | development    |
| PORT        | API port               | 3001           |
| JWT_SECRET  | Secret for JWT         | (change in prod) |
| JWT_EXPIRES_IN | Token expiry        | 7d             |
| DB_HOST     | MySQL host             | localhost      |
| DB_PORT     | MySQL port             | 3306           |
| DB_USER     | MySQL user             | root           |
| DB_PASSWORD | MySQL password         | (empty)        |
| DB_NAME     | Database name          | bookshelf      |
| CORS_ORIGIN | Allowed frontend origin | http://localhost:5173 |
| FRONTEND_URL | Base URL for reset link in email | http://localhost:5173 |
| SMTP_USER, SMTP_PASS, EMAIL_FROM | Gmail for sending reset emails | (optional) |

## Scripts

- **Frontend**: `npm run dev` (Vite), `npm run build`, `npm run preview`
- **Backend**: `cd server && npm run dev` (tsx watch), `npm run build`, `npm start`

## API overview

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me`
- **Books**: `GET /books?search=&status=&tag=&shelfId=&sort=&page=&limit=`, `POST /books`, `GET /books/:id`, `PUT /books/:id`, `DELETE /books/:id`
- **Shelves**: `GET /shelves`, `POST /shelves`, `PUT /shelves/:id`, `DELETE /shelves/:id`, `POST /shelves/:id/books/:bookId`, `DELETE /shelves/:id/books/:bookId`
- **Users**: `GET /users/profile`, `PUT /users/profile`

All book/shelf/user routes (except auth) require `Authorization: Bearer <token>`.

## License

MIT
