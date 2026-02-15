import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import { query, querySimple } from '../db.js';
import { authMiddleware, requireAdminFromDb } from '../middleware/auth.js';
import { validateRequest, asyncHandler } from '../middleware/error.js';
import type { JwtPayload } from '../types.js';

const router = Router();
router.use(authMiddleware);

/** Admin only: list all users (new signups / created accounts). Role checked from DB so demo user works after upgrade. */
router.get(
  '/list',
  requireAdminFromDb(),
  asyncHandler(async (_req: Request, res: Response) => {
    const raw = await querySimple<unknown[]>(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    const rows = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
    const users = rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      name: String(r.name ?? ''),
      email: String(r.email ?? ''),
      role: String(r.role ?? 'user'),
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
    }));
    res.json({ users });
  })
);

/** Admin only: delete a user (e.g. no longer needed). Cannot delete yourself. */
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).toInt()],
  requireAdminFromDb(),
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const adminUserId = (req as Request & { user: JwtPayload }).user.userId;
    const id = Number(req.params.id);
    if (id === adminUserId) {
      return res.status(400).json({ error: 'Bad Request', message: 'You cannot delete your own account' });
    }
    const result = await query<{ affectedRows?: number }>(
      'DELETE FROM users WHERE id = ?',
      [id]
    );
    const affected = (result as { affectedRows?: number })?.affectedRows ?? 0;
    if (affected === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted' });
  })
);

router.get('/profile', async (req: Request, res: Response) => {
  const userId = (req as Request & { user: JwtPayload }).user.userId;
  const rows = await query<({ id: number; name: string; email: string; role: string; created_at: Date })[]>(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [userId]
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) return res.status(404).json({ error: 'Not Found' });
  res.json({ user: row });
});

const updateProfileValidation = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('password').optional().isLength({ min: 8 }),
];

router.put(
  '/profile',
  updateProfileValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const { name, password } = req.body as { name?: string; password?: string };
    if (name !== undefined) {
      await query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);
    }
    const [rows] = await query<({ id: number; name: string; email: string; role: string })[]>(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [userId]
    );
    const row = Array.isArray(rows) ? rows[0] : rows;
    res.json({ user: row });
  }
);

export default router;
