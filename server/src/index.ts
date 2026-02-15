import bcrypt from 'bcryptjs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { logger } from './logger.js';
import { initDb, query } from './db.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFound } from './middleware/error.js';
import { initEmail } from './email.js';
import authRoutes from './routes/auth.js';
import booksRoutes from './routes/books.js';
import shelvesRoutes from './routes/shelves.js';
import usersRoutes from './routes/users.js';

const DEMO_EMAIL = 'demo@bookshelf.app';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'Demo User';

async function ensureDemoUser(): Promise<void> {
  const existing = await query<{ id: number; role: string }[]>(
    'SELECT id, role FROM users WHERE email = ? LIMIT 1',
    [DEMO_EMAIL]
  );
  const row = Array.isArray(existing) ? existing[0] : null;
  if (row) {
    // Ensure demo user is always admin so "Users" list works
    if ((row as { role?: string }).role !== 'admin') {
      await query('UPDATE users SET role = ? WHERE email = ?', ['admin', DEMO_EMAIL]);
      logger.info('Demo user upgraded to admin', { email: DEMO_EMAIL });
    }
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const insertResult = await query<{ insertId: number }>(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [DEMO_NAME, DEMO_EMAIL, passwordHash, 'admin']
  );
  const userId = Number(insertResult?.insertId ?? 0);
  if (userId < 1) throw new Error('Failed to create demo user');
  await query(
    'INSERT INTO shelves (user_id, name, is_default) VALUES (?, ?, 1), (?, ?, 1), (?, ?, 1)',
    [userId, 'To Read', userId, 'Reading', userId, 'Completed']
  );
  logger.info('Demo user created (admin)', { email: DEMO_EMAIL });
}

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts', message: 'Try again later' },
});
app.use('/auth', authLimiter);
app.use('/auth', authRoutes);

app.use('/books', booksRoutes);
app.use('/shelves', shelvesRoutes);
app.use('/users', usersRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  await initDb();
  await initEmail();
  await ensureDemoUser();
  app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`, { env: config.env });
  });
}

start().catch((err) => {
  logger.error('Failed to start server', { err });
  process.exit(1);
});
