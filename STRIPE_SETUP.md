# Stripe Setup Guide

This guide will help you set up Stripe for payment processing in your KDP Coloring Books application.

## Prerequisites

- A Stripe account (sign up at https://stripe.com)
- Access to your Supabase project dashboard

## Step 1: Create a Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Sign up for a Stripe account
3. Complete the account verification process

## Step 2: Create Products and Prices in Stripe

### Create Pro Plan Product

1. Go to Stripe Dashboard: https://dashboard.stripe.com/products
2. Click **"+ Add product"**
3. Fill in the details:
   - **Name**: KDP Coloring Books - Pro Plan
   - **Description**: 10 books per month, 50 pages per book, 200 AI generations
   - **Pricing model**: Standard pricing
   - **Price**: $19.00 USD
   - **Billing period**: Monthly (Recurring)
4. Click **"Add product"**
5. **Copy the Price ID** (starts with `price_...`) - you'll need this!

### Create Premium Plan Product

1. Click **"+ Add product"** again
2. Fill in the details:
   - **Name**: KDP Coloring Books - Premium Plan
   - **Description**: Unlimited books, 100 pages per book, 1000 AI generations
   - **Pricing model**: Standard pricing
   - **Price**: $49.00 USD
   - **Billing period**: Monthly (Recurring)
3. Click **"Add product"**
4. **Copy the Price ID** (starts with `price_...`) - you'll need this!

## Step 3: Get Your Stripe Secret Key

1. Go to Stripe Dashboard: https://dashboard.stripe.com/apikeys
2. In the **"Secret key"** section, click **"Reveal test key"**
3. **Copy the key** (starts with `sk_test_...`)

**Important**: Use test keys for development, and live keys only for production!

## Step 4: Set Up Webhook (for subscription status updates)

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click **"+ Add endpoint"**
3. Set the endpoint URL to:
   ```
   https://oddotckkfzinygtvnjhj.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. **Copy the Signing secret** (starts with `whsec_...`)

## Step 5: Add Environment Variables to Supabase

You need to add these environment variables. Since you mentioned you've added all secrets, please verify these are set:

### In Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Environment Variables**
3. Add the following variables:

| Variable Name | Value |
|---------------|-------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_PRO_PRICE_ID` | The Price ID from Pro Plan (`price_...`) |
| `STRIPE_PREMIUM_PRICE_ID` | The Price ID from Premium Plan (`price_...`) |
| `STRIPE_WEBHOOK_SECRET` | The webhook signing secret (`whsec_...`) |

## Step 6: Redeploy Edge Functions

After setting the environment variables, the edge functions should automatically use them. If not, you may need to redeploy them.

## Testing

### Test Mode

While in test mode (using `sk_test_` keys):
- Use test card: `4242 4242 4242 4242`
- Any future expiry date (e.g., 12/34)
- Any 3-digit CVC (e.g., 123)
- Any ZIP code (e.g., 12345)

### Live Mode

When ready for production:
1. Get your **live** keys from Stripe (they start with `sk_live_...` and `price_live_...`)
2. Update the environment variables in Supabase with live keys
3. Update the webhook endpoint URL to use the live webhook secret

## Verification

Once everything is set up:
1. Go to the Pricing page in your app
2. Try upgrading to Pro or Premium
3. You should be redirected to Stripe Checkout
4. Complete the payment with a test card
5. You should be redirected back to your app with updated subscription

## Troubleshooting

### "Failed to start checkout" Error
- Verify all environment variables are set correctly in Supabase
- Make sure Price IDs are from the correct Stripe account (test vs live)
- Check that Price IDs are for **recurring** subscriptions, not one-time payments

### Webhook Not Working
- Verify the webhook URL is correct
- Check that the signing secret matches
- Look at webhook logs in Stripe Dashboard → Webhooks → [Your Endpoint] → Logs

### Subscription Status Not Updating
- Ensure webhook is configured correctly
- Check the edge function logs in Supabase
- Verify RLS policies allow updates to subscriptions table

## Support

If you encounter issues:
- Check Stripe Dashboard logs
- Check Supabase Edge Function logs
- Review the error messages in browser console

## Security Notes

⚠️ **Never commit your secret keys to git!**
- Keep `.env` file in `.gitignore`
- Use environment variables for all sensitive data
- Use test keys for development, live keys only in production
