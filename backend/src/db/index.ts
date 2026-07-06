import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!_db) {
    _client = postgres(config.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      // Supabase requires SSL on all connections (direct & pooler)
      ssl: { rejectUnauthorized: false },
    });
    _db = drizzle(_client, { schema, logger: config.NODE_ENV === 'development' });
    logger.info('Database connection pool created');
  }
  return _db;
}

export async function closeDatabaseConnection() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
    logger.info('Database connection pool closed');
  }
}

export { schema };
