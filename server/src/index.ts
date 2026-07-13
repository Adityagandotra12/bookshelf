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
    if ((row as { role?: string }).role !== 'admin') {
      await query('UPDATE users SET role = ? WHERE email = ?', ['admin', DEMO_EMAIL]);
      logger.info('Demo user upgraded to admin', { email: DEMO_EMAIL });
    }
    return;
  }
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const insertResult = await query<{ insertId?: number }>(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [DEMO_NAME, DEMO_EMAIL, passwordHash, 'admin']
  );
  const userId = Number((insertResult as { insertId?: number })?.insertId ?? 0);
  if (userId < 1) throw new Error('Failed to create demo user');
  await query(
    'INSERT INTO shelves (user_id, name, is_default) VALUES (?, ?, 1), (?, ?, 1), (?, ?, 1)',
    [userId, 'To Read', userId, 'Reading', userId, 'Completed']
  );
  logger.info('Demo user created (admin)', { email: DEMO_EMAIL });
}

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = config.corsOrigins;
      if (!origin || allowed.includes(origin)) cb(null, origin ?? allowed[0]);
      else cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

let dbReady = false;

/** Health check for Render and load balancers */
app.get('/health', (_req, res) => {
  if (dbReady) {
    res.json({ ok: true });
    return;
  }
  res.status(503).json({ ok: false, error: 'Database not ready' });
});

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

async function start(): Promise<void> {
  const port = config.port;

  // Bind immediately so Render's port scan succeeds (before DB init).
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      logger.info(`Server listening on port ${port}`, { env: config.env, host: '0.0.0.0' });
      resolve();
    });
    server.on('error', reject);
  });

  try {
    await initDb();
    await initEmail();
    await ensureDemoUser();
    dbReady = true;
    logger.info('Application ready');
  } catch (err) {
    logger.error('Database connection failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    // Keep the process alive so Render logs remain accessible for debugging.
  }
}

start().catch((err) => {
  logger.error('Start failed', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
  process.exit(1);
});
