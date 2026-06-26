-- =============================================================================
-- Migration: Enable Row-Level Security (RLS) + Policies
-- 
-- After switching to Supabase Auth (Phases 1–3), API routes can now use the
-- user-scoped client (supabaseUserClient.ts) instead of the admin client for
-- regular operations.  This migration activates RLS on every user-facing table
-- so that those clients are constrained to rows they own.
--
-- The admin client (service-role key) bypasses all policies and continues to
-- work for admin-only operations.
-- =============================================================================

-- ── Helper: security-definer function to check admin role ──────────────
-- We need this because the admin check itself reads the User table, which
-- would cause a recursive RLS evaluation.  SECURITY DEFINER lets us bypass
-- RLS for this single lookup.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."User" WHERE id = auth.uid() AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true when the current session belongs to a user with role=admin. '
  'Created by migration 20260625070000_enable_rls.sql.';

-- =============================================================================
-- 1. "User" table
-- =============================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Users can see their own row
CREATE POLICY "Users can view own profile"
  ON "User"
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile columns (sensitive columns like
-- role / isActive / isBanned are guarded at the application level in
-- the API route handlers, not through RLS policy logic).
CREATE POLICY "Users can update own profile"
  ON "User"
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can read all rows (for the admin dashboard)
CREATE POLICY "Admins can view all profiles"
  ON "User"
  FOR SELECT
  USING (is_admin());

-- Admins can update any row (for moderation)
CREATE POLICY "Admins can update any profile"
  ON "User"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- 2. "Enrollment" table
-- =============================================================================
ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;

-- Users can see their own enrollments
CREATE POLICY "Users can view own enrollments"
  ON "Enrollment"
  FOR SELECT
  USING ("userId" = auth.uid());

-- Admins can see all enrollments
CREATE POLICY "Admins can view all enrollments"
  ON "Enrollment"
  FOR SELECT
  USING (is_admin());

-- Admins can insert/update enrollments (for manual enrollment)
CREATE POLICY "Admins can manage enrollments"
  ON "Enrollment"
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update enrollments"
  ON "Enrollment"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- 3. "UserProgress" table
-- =============================================================================
ALTER TABLE "UserProgress" ENABLE ROW LEVEL SECURITY;

-- Users can read their own progress
CREATE POLICY "Users can view own progress"
  ON "UserProgress"
  FOR SELECT
  USING ("userId" = auth.uid());

-- Users can insert their own progress rows
CREATE POLICY "Users can insert own progress"
  ON "UserProgress"
  FOR INSERT
  WITH CHECK ("userId" = auth.uid());

-- Users can update their own progress (watch duration, completion, etc.)
CREATE POLICY "Users can update own progress"
  ON "UserProgress"
  FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Admins can view all progress (for analytics/reporting)
CREATE POLICY "Admins can view all progress"
  ON "UserProgress"
  FOR SELECT
  USING (is_admin());

-- =============================================================================
-- 4. "Payment" table
-- =============================================================================
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Users can see their own payments
CREATE POLICY "Users can view own payments"
  ON "Payment"
  FOR SELECT
  USING ("userId" = auth.uid());

-- Admins can see all payments
CREATE POLICY "Admins can view all payments"
  ON "Payment"
  FOR SELECT
  USING (is_admin());

-- Admins can insert payments (for manual payment recording)
CREATE POLICY "Admins can insert payments"
  ON "Payment"
  FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update payments (approve/reject)
CREATE POLICY "Admins can update payments"
  ON "Payment"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- 5. "Certificate" table
-- =============================================================================
ALTER TABLE "Certificate" ENABLE ROW LEVEL SECURITY;

-- Users can see their own certificates
CREATE POLICY "Users can view own certificates"
  ON "Certificate"
  FOR SELECT
  USING ("userId" = auth.uid());

-- Anyone (including unauthenticated visitors) can view certificates for
-- verification purposes — this is required so that employers / third parties
-- can confirm a certificate's validity via the verification code.
CREATE POLICY "Anyone can verify certificates"
  ON "Certificate"
  FOR SELECT
  USING (true);

-- Admins can manage certificates (issue, revoke)
CREATE POLICY "Admins can manage certificates"
  ON "Certificate"
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update certificates"
  ON "Certificate"
  FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- 6. "Review" table
-- =============================================================================
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved reviews (displayed on course pages)
CREATE POLICY "Anyone can view approved reviews"
  ON "Review"
  FOR SELECT
  USING ("isApproved" = true OR "userId" = auth.uid());

-- Logged-in users can submit their own reviews
CREATE POLICY "Users can submit reviews"
  ON "Review"
  FOR INSERT
  WITH CHECK ("userId" = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON "Review"
  FOR UPDATE
  USING ("userId" = auth.uid())
  WITH CHECK ("userId" = auth.uid());

-- Admins can moderate all reviews (approve/delete)
CREATE POLICY "Admins can manage reviews"
  ON "Review"
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================================================
-- Verify
-- =============================================================================
SELECT 'RLS enabled on:' AS tbl
UNION ALL
SELECT '"User"' WHERE (SELECT relrowsecurity FROM pg_class WHERE relname = 'User')
UNION ALL
SELECT '"Enrollment"' WHERE (SELECT relrowsecurity FROM pg_class WHERE relname = 'Enrollment')
UNION ALL
SELECT '"UserProgress"' WHERE (SELECT relrowsecurity FROM pg_class WHERE relname = 'UserProgress')
UNION ALL
SELECT '"Payment"' WHERE (SELECT relrowsecurity FROM pg_class WHERE relname = 'Payment')
UNION ALL
SELECT '"Certificate"' WHERE (SELECT relrowsecurity FROM pg_class WHERE relname = 'Certificate')
UNION ALL
SELECT '"Review"' WHERE (SELECT relrowsecurity FROM pg_class WHERE relname = 'Review');
