-- ================================================================
-- DBL Digital Campaign Engine — Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- ----------------------------------------------------------------
-- 1. Create ENUM types (only in public schema)
-- ----------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.coupon_status AS ENUM ('available', 'assigned', 'redeemed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.admin_role AS ENUM ('superadmin', 'admin', 'receptionist');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------
-- 2. CAMPAIGNS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  start_date  TIMESTAMPTZ NOT NULL,
  end_date    TIMESTAMPTZ NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 3. USERS — campaign participants
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  city        TEXT,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One phone number per campaign (enforced at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_campaign_unique
  ON public.users (phone, campaign_id);

-- ----------------------------------------------------------------
-- 4. COUPONS — most critical table
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE RESTRICT,
  coupon_no   TEXT NOT NULL UNIQUE,
  prize       TEXT NOT NULL,
  status      public.coupon_status NOT NULL DEFAULT 'available',
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  redeemed    BOOLEAN NOT NULL DEFAULT FALSE,
  redeemed_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS coupons_campaign_status_idx ON public.coupons (campaign_id, status);
CREATE INDEX IF NOT EXISTS coupons_assigned_to_idx ON public.coupons (assigned_to);
CREATE INDEX IF NOT EXISTS coupons_coupon_no_idx ON public.coupons (coupon_no);

-- ----------------------------------------------------------------
-- 5. CLAIMS — immutable scratch audit log
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.claims (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  coupon_id  UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  ip         TEXT,
  device     TEXT,
  browser    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One claim per user (enforce single scratch)
CREATE UNIQUE INDEX IF NOT EXISTS claims_user_unique ON public.claims (user_id);

-- ----------------------------------------------------------------
-- 6. ADMINS
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          public.admin_role NOT NULL DEFAULT 'receptionist',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 7. SETTINGS — app configuration key-value store
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 8. COUPON_PRIZES — prize pool definitions per campaign
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupon_prizes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  prize       TEXT NOT NULL,
  quantity    INTEGER NOT NULL,
  remaining   INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- Done! All 7 tables + indexes created.
-- ----------------------------------------------------------------
