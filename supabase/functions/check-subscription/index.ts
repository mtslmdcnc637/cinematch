import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // JWT Authentication — only authenticated users can check their own subscription
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Check if user already has an active subscription in DB
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { data: existingSub } = await adminClient
      .from('subscriptions')
      .select('status, plan_type, stripe_customer_id, stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // If already active in DB, return it
    if (existingSub?.status === 'active') {
      return new Response(
        JSON.stringify({ status: existingSub.status, plan_type: existingSub.plan_type, source: 'database' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If we have a stripe_customer_id, check Stripe directly as fallback
    const stripeCustomerId = existingSub?.stripe_customer_id
    if (!stripeCustomerId) {
      return new Response(
        JSON.stringify({ status: 'free', plan_type: 'free', source: 'database' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Query Stripe API for the customer's subscriptions
    const secretKey = Deno.env.get('STRIPE_SECRET_KEY')!
    const stripeRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${stripeCustomerId}&status=active&limit=1`,
      { headers: { Authorization: `Bearer ${secretKey}` } }
    )
    const stripeData = await stripeRes.json()

    if (stripeData.data && stripeData.data.length > 0) {
      const sub = stripeData.data[0]
      const priceId = sub.items?.data?.[0]?.price?.id as string | undefined

      // Determine plan type from price ID
      let planType = 'monthly'
      const monthly = Deno.env.get('STRIPE_PRICE_MONTHLY')
      const quarterly = Deno.env.get('STRIPE_PRICE_QUARTERLY')
      const annual = Deno.env.get('STRIPE_PRICE_ANNUAL')
      if (priceId === quarterly) planType = 'quarterly'
      else if (priceId === annual) planType = 'annual'
      else if (priceId === monthly) planType = 'monthly'

      // Update DB with the correct status (fixes webhook miss)
      const periodStart = sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null

      await adminClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: sub.id,
          plan_type: planType,
          status: 'active',
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' })

      // Also update profile
      await adminClient
        .from('profiles')
        .update({ subscription_status: 'active', subscription_plan: planType })
        .eq('id', user.id)

      return new Response(
        JSON.stringify({ status: 'active', plan_type: planType, source: 'stripe' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No active subscription found in Stripe either
    return new Response(
      JSON.stringify({ status: existingSub?.status || 'free', plan_type: existingSub?.plan_type || 'free', source: 'database' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
