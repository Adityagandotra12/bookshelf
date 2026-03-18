import 'dotenv/config';

const port = process.env.PORT;
const dbPort = process.env.DB_PORT;

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: port ? parseInt(port, 10) : 3001,
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: dbPort ? parseInt(dbPort, 10) : 3306,
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'bookshelf',
    ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1',
  },
  /** Allowed frontend origin(s). Use FRONTEND_URL or CORS_ORIGIN. Comma-separated for multiple. */
  corsOrigin: process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  corsOrigins: (process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  backendPublicUrl: process.env.BACKEND_URL ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  email: (() => {
    const user = process.env.SMTP_USER ?? '';
    const pass = process.env.SMTP_PASS ?? '';
    const from = process.env.EMAIL_FROM ?? (user || 'noreply@bookshelf.app');
    const fromName = process.env.EMAIL_FROM_NAME ?? 'Bookshelf Helpdesk';
    const isGmail = /@gmail\.com$/i.test(user);
    const host = process.env.SMTP_HOST ?? (isGmail ? 'smtp.gmail.com' : '');
    return {
      host,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user,
      pass,
      from,
      fromName,
    };
  })(),
};
