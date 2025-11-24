import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRICE_IDS = {
  pro: Deno.env.get('STRIPE_PRO_PRICE_ID') || '',
  premium: Deno.env.get('STRIPE_PREMIUM_PRICE_ID') || '',
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      throw new Error('Stripe is not configured. Please set up your Stripe account and add the secret key.');
    }

    if (!PRICE_IDS.pro || !PRICE_IDS.premium) {
      throw new Error('Stripe price IDs are not configured. Please create products in Stripe and add the price IDs to your environment variables.');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const { plan_type } = await req.json();

    if (!plan_type || !['pro', 'premium'].includes(plan_type)) {
      throw new Error('Invalid plan type');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .maybeSingle();

    let { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!subscription) {
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: user.id,
          plan_type: 'free',
          status: 'active'
        }])
        .select()
        .single();
      subscription = newSub;
    }

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: {
          user_id: user.id,
        },
      });
      customerId = customer.id;

      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    const origin = req.headers.get('origin') || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: PRICE_IDS[plan_type as 'pro' | 'premium'],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}?subscription=success`,
      cancel_url: `${origin}?subscription=cancelled`,
      metadata: {
        user_id: user.id,
        plan_type: plan_type,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
