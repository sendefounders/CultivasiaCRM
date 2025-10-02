import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Parse the connection URL ourselves so nothing overrides ssl
const u = new URL(url);

export const pool = new Pool({
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, ''),
  // Force SSL but don't verify CA (dev only)
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
