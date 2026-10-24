import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is required for migrations.');
  process.exit(1);
}

const { Pool } = await import('pg');
const pool = new Pool({ connectionString: databaseUrl });

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(currentDir, '..', 'migrations');

const files = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

if (!files.length) {
  console.log('No migration files found.');
  process.exit(0);
}

try {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS forge_migration_log (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  for (const filename of files) {
    const already = await pool.query('SELECT filename FROM forge_migration_log WHERE filename = $1', [filename]);
    if (already.rowCount > 0) {
      console.log(`skip ${filename}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO forge_migration_log (filename) VALUES ($1)', [filename]);
      await pool.query('COMMIT');
      console.log(`applied ${filename}`);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }
} finally {
  await pool.end();
}

