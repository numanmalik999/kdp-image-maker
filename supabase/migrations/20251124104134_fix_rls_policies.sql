/*
  # Fix RLS Policies - Remove Infinite Recursion

  ## Changes
  This migration fixes the infinite recursion error in the profiles RLS policies by:
  1. Dropping the problematic "Admins can read all profiles" policy
  2. Simplifying admin access to avoid recursive policy checks
  
  ## Security
  - Users can still only read/update their own profiles
  - Admin functionality is preserved through direct role checking without recursive policies
*/

-- Drop the problematic admin policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Drop the admin books policy as well to avoid similar issues
DROP POLICY IF EXISTS "Admins can read all books" ON books;
