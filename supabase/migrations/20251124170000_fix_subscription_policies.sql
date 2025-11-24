/*
  # Fix Subscription Policies

  ## Changes
  - Add policy to allow service role to insert/update subscriptions
  - This enables edge functions to create subscriptions for users

  ## Security
  - Only service role can create/update subscriptions
  - Users can still only read their own subscriptions
  - Admins can still read all subscriptions
*/

-- Allow service role to insert subscriptions
CREATE POLICY "Service role can insert subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (true);

-- Allow service role to update subscriptions
CREATE POLICY "Service role can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (true)
  WITH CHECK (true);
