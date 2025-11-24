/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses multiple security and performance issues identified
  by Supabase's database advisor.

  ## Changes Made

  ### 1. Missing Indexes
  - Add index on static_pages.created_by (foreign key without covering index)

  ### 2. RLS Policy Optimization
  - Replace `auth.uid()` with `(select auth.uid())` in all RLS policies
  - Prevents re-evaluation of auth functions for each row
  - Significantly improves query performance at scale

  ### 3. Remove Unused Indexes
  - Drop indexes that are not being used by queries
  - Improves INSERT/UPDATE/DELETE performance
  - Reduces storage overhead

  ### 4. Consolidate Multiple Permissive Policies
  - Combine multiple SELECT policies into single policies
  - Simplifies policy evaluation
  - Improves query performance

  ### 5. Fix Function Search Paths
  - Add explicit search_path to functions
  - Prevents security vulnerabilities from search_path manipulation

  ## Security Impact
  - Enhanced RLS policy performance
  - Protected against search_path attacks
  - Maintained all existing access controls
*/

-- =====================================================
-- 1. ADD MISSING INDEXES
-- =====================================================

-- Add index for static_pages.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_static_pages_created_by ON public.static_pages(created_by);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - BOOKS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can read own books" ON public.books;
CREATE POLICY "Users can read own books"
  ON public.books FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own books" ON public.books;
CREATE POLICY "Users can create own books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own books" ON public.books;
CREATE POLICY "Users can update own books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own books" ON public.books;
CREATE POLICY "Users can delete own books"
  ON public.books FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - BOOK_PAGES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can read own book pages" ON public.book_pages;
CREATE POLICY "Users can read own book pages"
  ON public.book_pages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_pages.book_id
      AND books.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own book pages" ON public.book_pages;
CREATE POLICY "Users can create own book pages"
  ON public.book_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_pages.book_id
      AND books.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own book pages" ON public.book_pages;
CREATE POLICY "Users can update own book pages"
  ON public.book_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_pages.book_id
      AND books.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_pages.book_id
      AND books.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own book pages" ON public.book_pages;
CREATE POLICY "Users can delete own book pages"
  ON public.book_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_pages.book_id
      AND books.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - BOOK_CHAPTERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can read own book chapters" ON public.book_chapters;
CREATE POLICY "Users can read own book chapters"
  ON public.book_chapters FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_chapters.book_id
      AND books.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create own book chapters" ON public.book_chapters;
CREATE POLICY "Users can create own book chapters"
  ON public.book_chapters FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_chapters.book_id
      AND books.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own book chapters" ON public.book_chapters;
CREATE POLICY "Users can update own book chapters"
  ON public.book_chapters FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_chapters.book_id
      AND books.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_chapters.book_id
      AND books.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own book chapters" ON public.book_chapters;
CREATE POLICY "Users can delete own book chapters"
  ON public.book_chapters FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.books
      WHERE books.id = book_chapters.book_id
      AND books.user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 6. CONSOLIDATE SUBSCRIPTIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can read all subscriptions" ON public.subscriptions;

CREATE POLICY "Users and admins can read subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- =====================================================
-- 7. CONSOLIDATE USAGE_TRACKING POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can read own usage data" ON public.usage_tracking;
DROP POLICY IF EXISTS "Admins can read all usage data" ON public.usage_tracking;

CREATE POLICY "Users and admins can read usage data"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- =====================================================
-- 8. CONSOLIDATE STATIC_PAGES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Anyone can read published pages" ON public.static_pages;
DROP POLICY IF EXISTS "Admins can read all pages" ON public.static_pages;

CREATE POLICY "Users can read pages"
  ON public.static_pages FOR SELECT
  TO authenticated
  USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can create pages" ON public.static_pages;
CREATE POLICY "Admins can create pages"
  ON public.static_pages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update pages" ON public.static_pages;
CREATE POLICY "Admins can update pages"
  ON public.static_pages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete pages" ON public.static_pages;
CREATE POLICY "Admins can delete pages"
  ON public.static_pages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- =====================================================
-- 9. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_books_status;
DROP INDEX IF EXISTS public.idx_book_pages_book_id;
DROP INDEX IF EXISTS public.idx_book_chapters_book_id;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_customer_id;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_subscription_id;
DROP INDEX IF EXISTS public.idx_usage_tracking_period_end;
DROP INDEX IF EXISTS public.idx_static_pages_slug;
DROP INDEX IF EXISTS public.idx_static_pages_display_location;

-- =====================================================
-- 10. FIX FUNCTION SEARCH PATHS
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;