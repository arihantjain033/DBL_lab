import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Only look at the public schema — ignore Supabase internal schemas
  // (auth, realtime, storage, extensions, etc.)
  schemaFilter: ['public'],
  verbose: true,
  strict: false,  // false = no interactive prompts, auto-confirms
});
