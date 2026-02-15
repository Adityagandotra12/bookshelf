import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { config } from './config.js';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
let pool: mysql.Pool | null = null;

/**
 * Create the database and tables if they don't exist, then create the connection pool.
 * Call this once before using query() or the pool.
 */
export async function initDb(): Promise<void> {
  if (pool) return;

  const dbName = config.db.database;

  const connWithoutDb = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    await connWithoutDb.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    logger.info(`Database '${dbName}' ready`);

    const schemaPath = join(__dirname, '..', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    const statements = schema
      .split(';')
      .map((s) => s.replace(/--.*$/gm, '').trim())
      .filter((s) => s.length > 0 && !s.match(/^\s*$/));

    for (const stmt of statements) {
      try {
        await connWithoutDb.query(stmt);
      } catch (err: unknown) {
        const code = (err as { errno?: number })?.errno;
        if (code === 1061) {
          // ER_DUP_KEYNAME - index already exists, skip
          continue;
        }
        throw err;
      }
    }
    logger.info('Schema applied');
  } finally {
    await connWithoutDb.end();
  }

  pool = mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T> {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  const [rows] = await pool.execute(sql, params ?? []);
  return rows as T;
}

/** Run a query without prepared statement (use for SELECT with no params to avoid protocol issues). */
export async function querySimple<T = unknown>(sql: string): Promise<T> {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  const [rows] = await pool.query(sql);
  return rows as T;
}

/**
 * Run multiple operations in a transaction. If any throws, the transaction is rolled back.
 * Uses beginTransaction/commit/rollback (not raw SQL) so we avoid "prepared statement protocol" errors.
 */
export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

export function getPool(): mysql.Pool {
  if (!pool) throw new Error('Database not initialized. Call initDb() first.');
  return pool;
}
