import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { query } from '../db.js';
import type { JwtPayload } from '../types.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid token' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    (req as Request & { user: JwtPayload }).user = decoded;
    next();
  } catch (err) {
    logger.debug('JWT verify failed', { err });
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    (req as Request & { user?: JwtPayload }).user = decoded;
  } catch {
    // ignore
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Require admin by checking the current role in the database (not just JWT).
 * Use this for admin-only routes so that when the demo user is upgraded to admin
 * on server start, they get access even if their JWT still has the old role.
 */
export function requireAdminFromDb() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: JwtPayload }).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = Number(user.userId);
    if (!Number.isInteger(userId) || userId < 1) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid user' });
    }
    try {
      const rows = await query<{ role: string }[]>(
        'SELECT role FROM users WHERE id = ? LIMIT 1',
        [userId]
      );
      const row = Array.isArray(rows) ? rows[0] : rows;
      const role = row && typeof row === 'object' && 'role' in row ? String((row as { role: unknown }).role) : user.role;
      if (role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
      }
      (req as Request & { user: JwtPayload }).user = { ...user, role: 'admin' as const };
      next();
    } catch (err) {
      logger.error('requireAdminFromDb', { err });
      return res.status(500).json({ error: 'Internal Server Error', message: 'Permission check failed' });
    }
  };
}
