import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { query, withTransaction } from '../db.js';
import { config } from '../config.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateRequest, asyncHandler } from '../middleware/error.js';
import { logger } from '../logger.js';
import { sendPasswordResetEmail } from '../email.js';
import type { JwtPayload } from '../types.js';

const router = Router();

router.get('/reset-redirect', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const baseUrl = config.frontendUrl.replace(/\/$/, '');
  const resetUrl = token ? `${baseUrl}/reset-password?token=${encodeURIComponent(token)}` : baseUrl;
  res.redirect(302, resetUrl);
});

const registerValidation = [
  body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post(
  '/register',
  registerValidation,
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const name = (req.body?.name ?? '').trim();
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = req.body?.password ?? '';

      if (!name || !email || !password) {
        res.status(400).json({ error: 'Bad Request', message: 'Name, email and password are required' });
        return;
      }

      const existing = await query<unknown>(
        'SELECT id FROM users WHERE email = ? LIMIT 1',
        [email]
      );
      const existingList = Array.isArray(existing) ? existing : [];
      if (existingList.length > 0) {
        res.status(409).json({ error: 'Conflict', message: 'This email is already registered. Try logging in instead.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      let userId: number;
      try {
        userId = await withTransaction(async (conn) => {
          const insertRaw = await conn.execute(
            'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [name, email, passwordHash, 'user']
          );
          const first = Array.isArray(insertRaw) ? insertRaw[0] : insertRaw;
          const rawId =
            first && typeof first === 'object' && 'insertId' in first
              ? (first as { insertId: number | bigint }).insertId
              : undefined;
          const id = typeof rawId === 'bigint' ? Number(rawId) : Number(rawId);
          if (!id || id < 1) {
            logger.error('Register: invalid insertId', { insertRaw: insertRaw?.constructor?.name, first });
            throw new Error('Failed to create user');
          }
          await conn.execute(
            'INSERT INTO shelves (user_id, name, is_default) VALUES (?, ?, 1), (?, ?, 1), (?, ?, 1)',
            [id, 'To Read', id, 'Reading', id, 'Completed']
          );
          return id;
        });
      } catch (insertErr: unknown) {
        const err = insertErr as { errno?: number; code?: string };
        if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
          res.status(409).json({ error: 'Conflict', message: 'This email is already registered. Try logging in instead.' });
          return;
        }
        throw insertErr;
      }

      const token = jwt.sign(
        { userId, email, role: 'user' } as JwtPayload,
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn } as SignOptions
      );
      logger.info('User registered', { userId, email });
      res.status(201).json({
        user: { id: userId, name, email, role: 'user' },
        token,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      const errAny = err as { errno?: number; code?: string; sqlMessage?: string };
      logger.error('Register error', {
        message,
        errno: errAny.errno,
        code: errAny.code,
        sqlMessage: errAny.sqlMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      res.status(500).json({ error: 'Internal Server Error', message });
    }
  })
);

router.post(
  '/login',
  loginValidation,
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const email = (req.body?.email ?? '').trim();
    const password = req.body?.password ?? '';
    if (!email || !password) {
      res.status(400).json({ error: 'Bad Request', message: 'Email and password are required' });
      return;
    }

    const raw = await query<unknown>(
      'SELECT id, name, email, password_hash, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    const row = Array.isArray(raw) ? raw[0] : raw;
    const u = row && typeof row === 'object' ? (Object.assign({}, row) as Record<string, unknown>) : undefined;
    if (!u || typeof u.id !== 'number') {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const passwordHashRaw = u.password_hash ?? (u as Record<string, unknown>)['password_hash'];
    const passwordHash = passwordHashRaw != null ? String(passwordHashRaw) : '';
    if (!passwordHash) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    let match: boolean;
    try {
      match = await bcrypt.compare(password, passwordHash);
    } catch {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }
    if (!match) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign(
      { userId: u.id, email: String(u.email), role: String(u.role ?? 'user') } as JwtPayload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as SignOptions
    );
    res.json({
      user: {
        id: u.id,
        name: String(u.name ?? ''),
        email: String(u.email ?? ''),
        role: String(u.role ?? 'user'),
      },
      token,
    });
  })
);

router.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});

const forgotValidation = [
  body('email').isEmail().normalizeEmail(),
  body('origin').optional().isString().trim(),
];
function getResetLinkBaseUrl(requestOrigin?: string): string {
  const fromEnv = config.frontendUrl.replace(/\/$/, '');
  if (!requestOrigin || typeof requestOrigin !== 'string') return fromEnv;
  const o = requestOrigin.trim().replace(/\/$/, '');
  try {
    const parsed = new URL(o);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return o;
  } catch {
    /* ignore invalid origin */
  }
  return fromEnv;
}
router.post(
  '/forgot-password',
  forgotValidation,
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { email, origin } = req.body as { email: string; origin?: string };
    const baseUrl = getResetLinkBaseUrl(origin);
    const users = await query<{ id: number }[]>('SELECT id FROM users WHERE email = ?', [email]);
    if (Array.isArray(users) && users.length > 0) {
      const token = jwt.sign({ email, purpose: 'reset' }, config.jwtSecret, { expiresIn: '1h' });
      await query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
        [(users[0] as { id: number }).id, token]
      );
      const trimmedToken = token.trim();
      const resetLink = `${baseUrl.replace(/\s+/g, '')}/reset-password?token=${encodeURIComponent(trimmedToken)}`.trim();
      await sendPasswordResetEmail(email, resetLink);
    }
    res.json({ message: 'If an account exists, you will receive reset instructions by email.' });
  })
);

const resetValidation = [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];
router.post(
  '/reset-password',
  resetValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    const { token: rawToken, password } = req.body as { token: string; password: string };
    const token = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired reset token' });
    }
    let decoded: { email?: string; purpose?: string };
    try {
      decoded = jwt.verify(token, config.jwtSecret) as { email?: string; purpose?: string };
    } catch {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired reset token' });
    }
    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid token' });
    }
    const rows = await query<{ user_id: number }[]>(
      'SELECT user_id FROM password_reset_tokens WHERE token = ? AND expires_at > NOW()',
      [token]
    );
    const r = Array.isArray(rows) ? rows[0] : null;
    if (!r) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired reset token' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, (r as { user_id: number }).user_id]);
    await query('DELETE FROM password_reset_tokens WHERE token = ?', [token]);
    res.json({ message: 'Password reset successful' });
  }
);

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: JwtPayload }).user;
  const users = await query<({ id: number; name: string; email: string; role: string })[]>(
    'SELECT id, name, email, role FROM users WHERE id = ?',
    [userId]
  );
  const u = Array.isArray(users) ? users[0] : null;
  if (!u) return res.status(404).json({ error: 'Not Found' });
  res.json({ user: u });
});

export default router;
