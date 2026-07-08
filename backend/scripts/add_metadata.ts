import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config();

const sql = postgres(process.env.DATABASE_URL!);

async function run() {
  try {
    console.log('Creating prize_rules table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "prize_rules" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "prize_name" text NOT NULL,
        "minimum_billing" integer,
        "next_visit_only" boolean DEFAULT false NOT NULL,
        "show_minimum_billing" boolean DEFAULT false NOT NULL,
        "terms" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "prize_rules_prize_name_unique" UNIQUE("prize_name")
      );
    `;
    
    console.log('Adding metadata column to coupons...');
    await sql`
      ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
    `;

    console.log("Database schema updated successfully.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
run();
