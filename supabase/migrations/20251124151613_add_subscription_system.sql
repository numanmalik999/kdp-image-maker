/*
  # Add Subscription System

  ## Overview
  This migration adds a complete subscription management system with Stripe integration,
  usage tracking, and tiered access control for the KDP Coloring Books application.

  ## New Tables

  ### `subscriptions`
  Stores user subscription information and Stripe integration data.
  - `id` (uuid, primary key) - Unique subscription identifier
  - `user_id` (uuid, foreign key) - References profiles(id)
  - `stripe_customer_id` (text) - Stripe customer ID
  - `stripe_subscription_id` (text) - Stripe subscription ID
  - `plan_type` (text) - Subscription tier: 'free', 'pro', 'premium'
  - `status` (text) - Subscription status: 'active', 'cancelled', 'past_due', 'incomplete'
  - `current_period_start` (timestamptz) - Current billing period start
  - `current_period_end` (timestamptz) - Current billing period end
  - `cancel_at_period_end` (boolean) - Whether subscription will cancel at period end
  - `created_at` (timestamptz) - Subscription creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `usage_tracking`
  Tracks user resource usage per billing period.
  - `id` (uuid, primary key) - Unique tracking record identifier
  - `user_id` (uuid, foreign key) - References profiles(id)
  - `period_start` (timestamptz) - Tracking period start
  - `period_end` (timestamptz) - Tracking period end
  - `books_created` (integer) - Number of books created in period
  - `pages_generated` (integer) - Number of pages generated in period
  - `images_generated` (integer) - Number of AI images generated in period
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Modified Tables

  ### `profiles`
  Added subscription-related fields:
  - `subscription_tier` (text) - Current tier: 'free', 'pro', 'premium'
  - `books_limit` (integer) - Maximum books per month
  - `pages_per_book_limit` (integer) - Maximum pages per book
  - `ai_credits_remaining` (integer) - Remaining AI generation credits

  ## Security

  ### Row Level Security (RLS)
  All new tables have RLS enabled with restrictive policies:

  #### subscriptions
  - Users can read their own subscription
  - Only system/webhooks can insert/update subscriptions
  - Admins can read all subscriptions

  #### usage_tracking
  - Users can read their own usage data
  - Only system can insert/update usage data
  - Admins can read all usage data

  ## Indexes
  - `subscriptions.user_id` - Fast lookup of user subscriptions
  - `subscriptions.stripe_customer_id` - Fast Stripe customer lookup
  - `subscriptions.stripe_subscription_id` - Fast Stripe subscription lookup
  - `usage_tracking.user_id` - Fast lookup of user usage
  - `usage_tracking.period_end` - Query active periods

  ## Important Notes
  1. Free tier is the default for all users
  2. Usage tracking resets at each billing period
  3. Webhook signature verification required for subscription updates
  4. Stripe IDs are stored for customer portal and webhook processing
*/

-- Add subscription fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_tier text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'books_limit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN books_limit integer NOT NULL DEFAULT 2;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'pages_per_book_limit'
  ) THEN
    ALTER TABLE profiles ADD COLUMN pages_per_book_limit integer NOT NULL DEFAULT 20;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'ai_credits_remaining'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_credits_remaining integer NOT NULL DEFAULT 20;
  END IF;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  plan_type text NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'premium')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  books_created integer DEFAULT 0 NOT NULL,
  pages_generated integer DEFAULT 0 NOT NULL,
  images_generated integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period_end ON usage_tracking(period_end);

-- Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Usage tracking policies
CREATE POLICY "Users can read own usage data"
  ON usage_tracking FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all usage data"
  ON usage_tracking FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_tracking_updated_at
  BEFORE UPDATE ON usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to initialize user subscription
CREATE OR REPLACE FUNCTION initialize_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create free tier subscription for new user
  INSERT INTO subscriptions (user_id, plan_type, status)
  VALUES (NEW.id, 'free', 'active');

  -- Create initial usage tracking period (current month)
  INSERT INTO usage_tracking (
    user_id,
    period_start,
    period_end,
    books_created,
    pages_generated,
    images_generated
  )
  VALUES (
    NEW.id,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    0,
    0,
    0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to initialize subscription on profile creation
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_subscription();

-- Create function to update profile limits based on subscription tier
CREATE OR REPLACE FUNCTION update_profile_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile limits based on plan type
  IF NEW.plan_type = 'free' THEN
    UPDATE profiles SET
      subscription_tier = 'free',
      books_limit = 2,
      pages_per_book_limit = 20,
      ai_credits_remaining = 20
    WHERE id = NEW.user_id;
  ELSIF NEW.plan_type = 'pro' THEN
    UPDATE profiles SET
      subscription_tier = 'pro',
      books_limit = 10,
      pages_per_book_limit = 50,
      ai_credits_remaining = 200
    WHERE id = NEW.user_id;
  ELSIF NEW.plan_type = 'premium' THEN
    UPDATE profiles SET
      subscription_tier = 'premium',
      books_limit = 999999,
      pages_per_book_limit = 100,
      ai_credits_remaining = 1000
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update limits when subscription changes
DROP TRIGGER IF EXISTS on_subscription_updated ON subscriptions;
CREATE TRIGGER on_subscription_updated
  AFTER INSERT OR UPDATE OF plan_type ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_limits();
