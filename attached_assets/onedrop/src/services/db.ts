import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config.js';
import { log } from '../utils/logger.js';

const sql = postgres(env.DATABASE_URL, { max: 5, idle_timeout: 20 });
export const db = drizzle(sql);

export async function pingDb() {
  try {
    await sql`select 1`;
    return true;
  } catch (e) {
    log.error('DB ping failed', e);
    return false;
  }
}
