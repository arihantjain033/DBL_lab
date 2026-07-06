/**
 * DBL — Database Setup Script
 * Runs the initial SQL migration directly against your Supabase database.
 * Usage: node src/db/migrate.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n❌  DATABASE_URL is not set in backend/.env\n');
  process.exit(1);
}

console.log('\n📦  DBL Database Setup');
console.log('━'.repeat(50));
console.log('🔗  Connecting to database...\n');

const sql = postgres(DATABASE_URL, {
  max: 1,
  ssl: { rejectUnauthorized: false },
  onnotice: () => {}, // suppress notices
});

const migrationPath = join(__dirname, 'migrations', '0001_initial_schema.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

try {
  console.log('📋  Running schema migration...\n');
  await sql.unsafe(migrationSQL);

  console.log('✅  Tables created successfully:\n');
  console.log('   ✓  campaigns');
  console.log('   ✓  users');
  console.log('   ✓  coupons');
  console.log('   ✓  claims');
  console.log('   ✓  admins');
  console.log('   ✓  settings');
  console.log('   ✓  coupon_prizes');
  console.log('\n🎉  Database setup complete! No data was inserted.\n');
} catch (err) {
  console.error('\n❌  Migration failed:\n');
  console.error(err.message);
  process.exit(1);
} finally {
  await sql.end();
}
