/**
 * Creates a demo user so you can log in easily.
 * Run from server folder: npx tsx scripts/seed.ts
 *
 * Demo login:
 *   Email:    demo@bookshelf.app
 *   Password: demo123
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDb, query } from '../src/db.js';

const DEMO_EMAIL = 'demo@bookshelf.app';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'Demo User';

async function seed() {
  await initDb();

  const existing = await query<{ id: number }[]>(
    'SELECT id FROM users WHERE email = ?',
    [DEMO_EMAIL]
  );
  if (Array.isArray(existing) && existing.length > 0) {
    console.log('Demo user already exists. Use these credentials to log in:');
    console.log('  Email:    ' + DEMO_EMAIL);
    console.log('  Password: ' + DEMO_PASSWORD);
    process.exit(0);
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const insertResult = await query<{ insertId: number }>(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [DEMO_NAME, DEMO_EMAIL, passwordHash, 'user']
  );
  const userId = insertResult.insertId;

  await query(
    'INSERT INTO shelves (user_id, name, is_default) VALUES (?, ?, 1), (?, ?, 1), (?, ?, 1)',
    [userId, 'To Read', userId, 'Reading', userId, 'Completed']
  );

  console.log('Demo user created. Log in with:');
  console.log('  Email:    ' + DEMO_EMAIL);
  console.log('  Password: ' + DEMO_PASSWORD);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
