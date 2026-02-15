import { Router, Request, Response } from 'express';
import { body, param, query as q } from 'express-validator';
import { query } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateRequest, asyncHandler } from '../middleware/error.js';
import { logger } from '../logger.js';
import type { JwtPayload } from '../types.js';

const router = Router();
router.use(authMiddleware);

const sortFields = ['recently_added', 'title', 'author', 'rating', 'progress'] as const;
const statusValues = ['to_read', 'reading', 'completed', 'dropped'] as const;

function parseJsonArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try {
      const a = JSON.parse(val);
      return Array.isArray(a) ? a.map(String) : [];
    } catch {
      return val ? [val] : [];
    }
  }
  return [];
}

router.get(
  '/',
  [
    q('search').optional().isString(),
    q('status').optional().isIn(statusValues),
    q('tag').optional().isString(),
    q('shelfId').optional().isInt(),
    q('sort').optional().isIn(sortFields),
    q('page').optional().isInt({ min: 1 }).toInt(),
    q('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const rawUserId = (req as Request & { user: JwtPayload }).user.userId;
    const userId = Number(rawUserId);
    if (!Number.isInteger(userId) || userId < 1) {
      logger.error('Books list: invalid userId from JWT', { rawUserId });
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid session' });
    }
    const search = (req.query.search as string) ?? '';
    const status = req.query.status as string | undefined;
    const tag = req.query.tag as string | undefined;
    const shelfId = req.query.shelfId ? parseInt(req.query.shelfId as string, 10) : undefined;
    const sort = (req.query.sort as string) ?? 'recently_added';
    const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));
    const offset = (page - 1) * limit;

    let sql = `
      SELECT b.id, b.user_id, b.title, b.authors, b.isbn, b.publisher, b.year, b.cover_url,
             b.category, b.tags, b.description_notes, b.status, b.rating, b.total_pages,
             b.current_page, b.start_date, b.end_date, b.created_at, b.updated_at
      FROM books b
      WHERE b.user_id = ?
    `;
    const params: (string | number)[] = [userId];

    if (shelfId) {
      sql += ` AND EXISTS (SELECT 1 FROM shelf_books sb WHERE sb.shelf_id = ? AND sb.book_id = b.id)`;
      params.push(shelfId);
    }
    if (status) {
      sql += ` AND b.status = ?`;
      params.push(status);
    }
    if (search) {
      sql += ` AND (b.title LIKE ? OR b.authors LIKE ? OR b.tags LIKE ? OR b.category LIKE ?)`;
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }
    if (tag) {
      sql += ` AND JSON_CONTAINS(b.tags, ?)`;
      params.push(JSON.stringify(tag));
    }

    if (sort === 'title') sql += ' ORDER BY b.title ASC';
    else if (sort === 'author') sql += ' ORDER BY b.authors ASC';
    else if (sort === 'rating') sql += ' ORDER BY b.rating IS NULL, b.rating DESC, b.title ASC';
    else if (sort === 'progress') sql += ' ORDER BY b.current_page DESC, b.total_pages ASC';
    else sql += ' ORDER BY b.created_at DESC';
    // Use literal LIMIT/OFFSET (already validated integers) to avoid mysqld_stmt_execute errors
    const limitNum = Number(limit) || 20;
    const offsetNum = Number(offset) || 0;
    sql += ` LIMIT ${Math.max(0, Math.min(limitNum, 100))} OFFSET ${Math.max(0, offsetNum)}`;

    const rawBooks = await query<unknown>(sql, params);
    const bookRows = Array.isArray(rawBooks) ? rawBooks : rawBooks != null ? [rawBooks] : [];

    // Count total
    let countSql = 'SELECT COUNT(*) as total FROM books b WHERE b.user_id = ?';
    const countParams: (string | number)[] = [userId];
    if (shelfId) {
      countSql += ` AND EXISTS (SELECT 1 FROM shelf_books sb WHERE sb.shelf_id = ? AND sb.book_id = b.id)`;
      countParams.push(shelfId);
    }
    if (status) {
      countSql += ` AND b.status = ?`;
      countParams.push(status);
    }
    if (search) {
      countSql += ` AND (b.title LIKE ? OR b.authors LIKE ? OR b.tags LIKE ? OR b.category LIKE ?)`;
      const like = `%${search}%`;
      countParams.push(like, like, like, like);
    }
    if (tag) {
      countSql += ` AND JSON_CONTAINS(b.tags, ?)`;
      countParams.push(JSON.stringify(tag));
    }
    const countRaw = await query<unknown>(countSql, countParams);
    const countRows = Array.isArray(countRaw) ? countRaw : countRaw != null ? [countRaw] : [];
    const firstCount = countRows[0] as { total?: number } | undefined;
    const total = Number(firstCount?.total ?? 0);

    // Status counts for "my books" summary (same filters except status)
    let statusCounts: Record<string, number> = { to_read: 0, reading: 0, completed: 0, dropped: 0 };
    let statusSql = 'SELECT status, COUNT(*) as cnt FROM books b WHERE b.user_id = ?';
    const statusParams: (string | number)[] = [userId];
    if (shelfId) {
      statusSql += ' AND EXISTS (SELECT 1 FROM shelf_books sb WHERE sb.shelf_id = ? AND sb.book_id = b.id)';
      statusParams.push(shelfId);
    }
    if (search) {
      statusSql += ' AND (b.title LIKE ? OR b.authors LIKE ? OR b.tags LIKE ? OR b.category LIKE ?)';
      const like = `%${search}%`;
      statusParams.push(like, like, like, like);
    }
    if (tag) {
      statusSql += ' AND JSON_CONTAINS(b.tags, ?)';
      statusParams.push(JSON.stringify(tag));
    }
    statusSql += ' GROUP BY status';
    try {
      const statusRaw = await query<unknown>(statusSql, statusParams);
      const statusRows = Array.isArray(statusRaw) ? statusRaw : statusRaw != null ? [statusRaw] : [];
      for (const r of statusRows) {
        const row = r as { status?: string; cnt?: number };
        if (row?.status && row.status in statusCounts) {
          statusCounts[row.status] = Number(row.cnt ?? 0);
        }
      }
    } catch {
      // ignore
    }

    const normalized = bookRows.map((row: Record<string, unknown>) => {
      let authors = row.authors;
      let tags = row.tags;
      if (typeof row.authors === 'string') {
        try {
          authors = JSON.parse(row.authors as string);
        } catch {
          authors = [];
        }
      }
      if (typeof row.tags === 'string') {
        try {
          tags = JSON.parse(row.tags as string);
        } catch {
          tags = [];
        }
      }
      return { ...row, authors, tags };
    });

    res.json({ books: normalized, total, page, limit, statusCounts });
  })
);

router.get(
  '/:id',
  [param('id').isInt().toInt()],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const id = parseInt(req.params.id, 10);
    const rows = await query<Record<string, unknown>[]>(
      'SELECT * FROM books WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return res.status(404).json({ error: 'Not Found', message: 'Book not found' });
    const book = {
      ...row,
      authors: typeof row.authors === 'string' ? JSON.parse(row.authors as string) : row.authors,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags as string) : row.tags,
    };
    res.json(book);
  }
);

/** Get shelf IDs this book is on (for "move between shelves" UI). */
router.get(
  '/:id/shelves',
  [param('id').isInt().toInt()],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const id = parseInt(req.params.id, 10);
    const [bookRow] = await query<{ id: number }[]>(
      'SELECT id FROM books WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!bookRow) return res.status(404).json({ error: 'Not Found', message: 'Book not found' });
    const shelfRows = await query<{ shelf_id: number }[]>(
      'SELECT shelf_id FROM shelf_books WHERE book_id = ?',
      [id]
    );
    const list = Array.isArray(shelfRows) ? shelfRows : [];
    const shelfIds = list.map((r) => r.shelf_id);
    res.json({ shelfIds });
  }
);

const bookBodyValidation = [
  body('title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required'),
  body('authors').custom((val) => {
    const a = parseJsonArray(val);
    return true;
  }),
  body('isbn').optional().trim().isLength({ max: 20 }),
  body('publisher').optional().trim().isLength({ max: 255 }),
  body('year').optional().isInt({ min: 0, max: 2100 }).toInt(),
  body('cover_url').optional().trim(),
  body('category').optional().trim().isLength({ max: 100 }),
  body('tags').optional(),
  body('description_notes').optional().trim(),
  body('status').optional().isIn(statusValues),
  body('rating').optional().isInt({ min: 1, max: 5 }).toInt(),
  body('total_pages').optional().isInt({ min: 0 }).toInt(),
  body('current_page').optional().isInt({ min: 0 }).toInt(),
  body('start_date').optional().trim(),
  body('end_date').optional().trim(),
];

router.post(
  '/',
  bookBodyValidation,
  validateRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const rawUserId = (req as Request & { user: JwtPayload }).user.userId;
    const userId = Number(rawUserId);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid session' });
    }
    const b = req.body;
    const authors = JSON.stringify(parseJsonArray(b.authors));
    const tags = JSON.stringify(parseJsonArray(b.tags));
    const status = b.status ?? 'to_read';

    const num = (v: unknown): number | null => {
      if (v === '' || v === undefined || v === null) return null;
      const n = typeof v === 'number' ? v : parseInt(String(v), 10);
      return Number.isNaN(n) ? null : n;
    };
    const insertRaw = await query<unknown>(
      `INSERT INTO books (user_id, title, authors, isbn, publisher, year, cover_url, category, tags, description_notes, status, rating, total_pages, current_page, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        b.title,
        authors,
        b.isbn || null,
        b.publisher || null,
        num(b.year),
        b.cover_url || null,
        b.category || null,
        tags,
        b.description_notes || null,
        status,
        num(b.rating),
        num(b.total_pages),
        num(b.current_page),
        b.start_date || null,
        b.end_date || null,
      ]
    );
    const first = Array.isArray(insertRaw) ? insertRaw[0] : insertRaw;
    const rawId =
      first && typeof first === 'object' && 'insertId' in first
        ? (first as { insertId: number | bigint }).insertId
        : undefined;
    const bookId = typeof rawId === 'bigint' ? Number(rawId) : Number(rawId);
    if (!bookId || bookId < 1) {
      logger.error('Books create: invalid insertId', { insertRaw: insertRaw?.constructor?.name });
      return res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create book' });
    }

    // Add to default shelf by status (To Read, Reading, Completed only)
    const defaultNames: Record<string, string> = { to_read: 'To Read', reading: 'Reading', completed: 'Completed' };
    const shelfName = defaultNames[status];
    let shelfId: number | null = null;
    if (shelfName) {
      const shelfRows = await query<unknown>(
        'SELECT id FROM shelves WHERE user_id = ? AND is_default = 1 AND LOWER(name) = LOWER(?)',
        [userId, shelfName]
      );
      const shelfRow = Array.isArray(shelfRows) ? shelfRows[0] : shelfRows;
      shelfId =
        shelfRow && typeof shelfRow === 'object' && shelfRow !== null && 'id' in shelfRow
          ? Number((shelfRow as { id: unknown }).id)
          : null;
    }
    if (shelfId && shelfId > 0) {
      await query('INSERT INTO shelf_books (shelf_id, book_id) VALUES (?, ?)', [shelfId, bookId]);
    }

    const createdRaw = await query<unknown>('SELECT * FROM books WHERE id = ?', [bookId]);
    const createdRows = Array.isArray(createdRaw) ? createdRaw : createdRaw != null ? [createdRaw] : [];
    const row = createdRows[0] as Record<string, unknown> | undefined;
    const book = row
      ? {
          ...row,
          authors:
            typeof row.authors === 'string' ? JSON.parse(row.authors as string) : row.authors,
          tags: typeof row.tags === 'string' ? JSON.parse(row.tags as string) : row.tags,
        }
      : null;
    res.status(201).json(book);
  })
);

router.put(
  '/:id',
  [param('id').isInt().toInt(), ...bookBodyValidation],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const id = parseInt(req.params.id, 10);
    const b = req.body;
    const authors = JSON.stringify(parseJsonArray(b.authors));
    const tags = JSON.stringify(parseJsonArray(b.tags));

    const [result] = await query<{ affectedRows: number }[]>(
      `UPDATE books SET title = ?, authors = ?, isbn = ?, publisher = ?, year = ?, cover_url = ?, category = ?, tags = ?, description_notes = ?, status = ?, rating = ?, total_pages = ?, current_page = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        b.title,
        authors,
        b.isbn || null,
        b.publisher || null,
        b.year ?? null,
        b.cover_url || null,
        b.category || null,
        tags,
        b.description_notes || null,
        b.status ?? 'to_read',
        b.rating ?? null,
        b.total_pages ?? null,
        b.current_page ?? null,
        b.start_date || null,
        b.end_date || null,
        id,
        userId,
      ]
    );
    const affected = (result as unknown as { affectedRows: number })?.affectedRows ?? 0;
    if (affected === 0) return res.status(404).json({ error: 'Not Found', message: 'Book not found' });

    const [rows] = await query<Record<string, unknown>[]>(
      'SELECT * FROM books WHERE id = ?',
      [id]
    );
    const row = Array.isArray(rows) ? rows[0] : rows;
    const book = row
      ? {
          ...row,
          authors: typeof (row as Record<string, unknown>).authors === 'string'
            ? JSON.parse((row as Record<string, unknown>).authors as string)
            : (row as Record<string, unknown>).authors,
          tags: typeof (row as Record<string, unknown>).tags === 'string'
            ? JSON.parse((row as Record<string, unknown>).tags as string)
            : (row as Record<string, unknown>).tags,
        }
      : null;
    res.json(book);
  }
);

router.delete(
  '/:id',
  [param('id').isInt().toInt()],
  validateRequest,
  async (req: Request, res: Response) => {
    const userId = (req as Request & { user: JwtPayload }).user.userId;
    const id = parseInt(req.params.id, 10);
    await query('DELETE FROM shelf_books WHERE book_id = ?', [id]);
    const [result] = await query<{ affectedRows: number }[]>(
      'DELETE FROM books WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const affected = (result as unknown as { affectedRows: number })?.affectedRows ?? 0;
    if (affected === 0) return res.status(404).json({ error: 'Not Found', message: 'Book not found' });
    res.status(204).send();
  }
);

export default router;
