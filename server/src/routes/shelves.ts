import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest } from '../middleware/error.js';
import type { JwtPayload } from '../types.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const userId = (req as Request & { user: JwtPayload }).user.userId;
  const shelves = await query<Record<string, unknown>[]>(
    'SELECT id, user_id, name, is_default, created_at FROM shelves WHERE user_id = ? ORDER BY is_default DESC, name ASC',
    [userId]
  );
  res.json({ shelves: shelves ?? [] });
});

router.post(
  '/',
  [body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Shelf name is required')],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const { name } = req.body as { name: string };
    const result = await query<{ insertId: number }>(
      'INSERT INTO shelves (user_id, name, is_default) VALUES (?, ?, 0)',
      [userId, name]
    );
    const id = result.insertId;
    const [rows] = await query<Record<string, unknown>[]>(
      'SELECT id, user_id, name, is_default, created_at FROM shelves WHERE id = ?',
      [id]
    );
    const shelf = Array.isArray(rows) ? rows[0] : rows;
    res.status(201).json(shelf);
  }
);

router.put(
  '/:id',
  [
    param('id').isInt().toInt(),
    body('name').trim().isLength({ min: 1, max: 255 }).withMessage('Shelf name is required'),
  ],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const id = parseInt(req.params.id, 10);
    const { name } = req.body as { name: string };
    const [result] = await query<{ affectedRows: number }[]>(
      'UPDATE shelves SET name = ? WHERE id = ? AND user_id = ? AND is_default = 0',
      [name, id, userId]
    );
    const affected = (result as unknown as { affectedRows: number })?.affectedRows ?? 0;
    if (affected === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Shelf not found or cannot edit default shelf' });
    }
    const [rows] = await query<Record<string, unknown>[]>(
      'SELECT id, user_id, name, is_default, created_at FROM shelves WHERE id = ?',
      [id]
    );
    res.json(Array.isArray(rows) ? rows[0] : rows);
  }
);

router.delete(
  '/:id',
  [param('id').isInt().toInt()],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM shelf_books WHERE shelf_id = ?', [id]);
    const [result] = await query<{ affectedRows: number }[]>(
      'DELETE FROM shelves WHERE id = ? AND user_id = ? AND is_default = 0',
      [id, userId]
    );
    const affected = (result as unknown as { affectedRows: number })?.affectedRows ?? 0;
    if (affected === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Shelf not found or cannot delete default shelf' });
    }
    res.status(204).send();
  }
);

router.post(
  '/:id/books/:bookId',
  [param('id').isInt().toInt(), param('bookId').isInt().toInt()],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const shelfId = parseInt(req.params.id, 10);
    const bookId = parseInt(req.params.bookId, 10);

    const [shelf] = await query<{ id: number }[]>(
      'SELECT id FROM shelves WHERE id = ? AND user_id = ?',
      [shelfId, userId]
    );
    if (!shelf) return res.status(404).json({ error: 'Not Found', message: 'Shelf not found' });

    const [book] = await query<{ id: number }[]>(
      'SELECT id FROM books WHERE id = ? AND user_id = ?',
      [bookId, userId]
    );
    if (!book) return res.status(404).json({ error: 'Not Found', message: 'Book not found' });

    await query('INSERT IGNORE INTO shelf_books (shelf_id, book_id) VALUES (?, ?)', [shelfId, bookId]);
    res.status(201).json({ message: 'Book added to shelf' });
  }
);

router.delete(
  '/:id/books/:bookId',
  [param('id').isInt().toInt(), param('bookId').isInt().toInt()],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const shelfId = parseInt(req.params.id, 10);
    const bookId = parseInt(req.params.bookId, 10);

    const [shelf] = await query<{ id: number }[]>(
      'SELECT id FROM shelves WHERE id = ? AND user_id = ?',
      [shelfId, userId]
    );
    if (!shelf) return res.status(404).json({ error: 'Not Found', message: 'Shelf not found' });

    await query('DELETE FROM shelf_books WHERE shelf_id = ? AND book_id = ?', [shelfId, bookId]);
    res.status(204).send();
  }
);

export default router;
