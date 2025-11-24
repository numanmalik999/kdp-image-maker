/*
  # Auto-Create Profiles for New Users

  ## Overview
  This migration adds a database trigger to automatically create profile records
  when new users sign up through Supabase Auth. This ensures all users have
  corresponding profiles without relying on frontend code.

  ## Changes
  1. Create trigger function to handle new user creation
  2. Attach trigger to auth.users table
  3. Backfill missing profiles for existing users

  ## Benefits
  - Ensures data consistency between auth.users and profiles
  - Works with any authentication method (email, OAuth, etc.)
  - Eliminates dependency on frontend profile creation
  - Admin dashboard shows all registered users

  ## Security
  - Function runs with SECURITY DEFINER to bypass RLS
  - Only creates profiles, doesn't expose sensitive auth data
  - Maintains existing RLS policies on profiles table
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users without profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  'user'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Ensure all users have subscriptions
INSERT INTO public.subscriptions (user_id, plan_type, status)
SELECT 
  p.id,
  'free',
  'active'
FROM public.profiles p
LEFT JOIN public.subscriptions s ON p.id = s.user_id
WHERE s.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Ensure all users have usage tracking
INSERT INTO public.usage_tracking (
  user_id,
  period_start,
  period_end,
  books_created,
  pages_generated,
  images_generated
)
SELECT 
  p.id,
  date_trunc('month', now()),
  date_trunc('month', now()) + interval '1 month',
  0,
  0,
  0
FROM public.profiles p
LEFT JOIN public.usage_tracking ut ON p.id = ut.user_id 
  AND ut.period_end > now()
WHERE ut.id IS NULL;
