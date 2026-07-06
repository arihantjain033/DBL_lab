-- ================================================================
-- DBL — Database Views
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- ────────────────────────────────────────────────────────────
-- VIEW: v_coupons_detail
-- Shows every coupon with the full user details of who holds it.
-- Replaces the need to manually JOIN coupons + users.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_coupons_detail AS
SELECT
  c.id                                                         AS coupon_id,
  c.coupon_no,
  c.prize,
  c.status,
  c.redeemed,
  c.assigned_at,
  c.redeemed_at,
  c.expiry_date,
  c.created_at                                                 AS coupon_created_at,
  ca.id                                                        AS campaign_id,
  ca.name                                                      AS campaign_name,

  -- User details (NULL when status = 'available')
  u.id                                                         AS user_id,
  u.name                                                       AS user_name,
  u.phone                                                      AS user_phone,
  u.email                                                      AS user_email,
  u.city                                                       AS user_city,
  u.created_at                                                 AS user_registered_at
FROM public.coupons c
JOIN public.campaigns ca ON c.campaign_id = ca.id
LEFT JOIN public.users u  ON c.assigned_to = u.id;

-- ────────────────────────────────────────────────────────────
-- VIEW: v_users_detail
-- Shows every participant with their coupon details.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_users_detail AS
SELECT
  u.id                                                         AS user_id,
  u.name                                                       AS user_name,
  u.phone                                                      AS user_phone,
  u.email                                                      AS user_email,
  u.city                                                       AS user_city,
  u.created_at                                                 AS registered_at,
  ca.id                                                        AS campaign_id,
  ca.name                                                      AS campaign_name,

  -- Coupon details (NULL if user registered but hasn't scratched yet)
  c.id                                                         AS coupon_id,
  c.coupon_no,
  c.prize,
  c.status                                                     AS coupon_status,
  c.redeemed,
  c.assigned_at,
  c.redeemed_at,
  c.expiry_date
FROM public.users u
JOIN public.campaigns ca ON u.campaign_id = ca.id
LEFT JOIN public.coupons c ON c.assigned_to = u.id;

-- ────────────────────────────────────────────────────────────
-- VIEW: v_daily_summary
-- Daily stats per campaign for dashboard charts.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_daily_summary AS
SELECT
  ca.name                                                      AS campaign_name,
  DATE(u.created_at AT TIME ZONE 'Asia/Kolkata')               AS date,
  COUNT(DISTINCT u.id)                                         AS registrations,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status != 'available') AS scratches,
  COUNT(DISTINCT c.id) FILTER (WHERE c.redeemed = true)       AS redemptions
FROM public.campaigns ca
LEFT JOIN public.users u    ON u.campaign_id = ca.id
LEFT JOIN public.coupons c  ON c.assigned_to = u.id
GROUP BY ca.name, DATE(u.created_at AT TIME ZONE 'Asia/Kolkata')
ORDER BY date DESC;
