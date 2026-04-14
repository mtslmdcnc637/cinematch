import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_API_BASE = "https://api.stripe.com/v1"

/**
 * Flatten a nested object into Stripe's bracket-notation form encoding.
 * e.g. { metadata: { supabase_user_id: "abc" } } → "metadata[supabase_user_id]=abc"
 */
function flattenForStripe(
  obj: Record<string, unknown>,
  prefix = ""
): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (value !== null && value !== undefined && typeof value === "object" && !Array.isArray(value)) {
      pairs.push(...flattenForStripe(value as Record<string, unknown>, fullKey))
    } else {
      pairs.push([fullKey, String(value ?? "")])
    }
  }
  return pairs
}

// Helper: make an authenticated request to the Stripe REST API
async function stripeRequest(
  path: string,
  method: "GET" | "POST" = "POST",
  body?: Record<string, unknown>
) {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY")
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured")

  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey}`,
  }

  let url = `${STRIPE_API_BASE}${path}`

  if (method === "POST" && body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded"
    const encoded = flattenForStripe(body)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&")
    const res = await fetch(url, { method, headers, body: encoded })
    return res.json()
  }

  // GET
  if (body) {
    const qs = flattenForStripe(body)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&")
    url += `?${qs}`
  }
  const res = await fetch(url, { method, headers })
  return res.json()
}

// Price ID mapping from plan_id to Stripe Price ID env vars
function getPriceId(planId: string): string {
  const mapping: Record<string, string | undefined> = {
    monthly: Deno.env.get("STRIPE_PRICE_MONTHLY"),
    quarterly: Deno.env.get("STRIPE_PRICE_QUARTERLY"),
    annual: Deno.env.get("STRIPE_PRICE_ANNUAL"),
  }
  const priceId = mapping[planId]
  if (!priceId) {
    throw new Error(`Invalid plan_id "${planId}" or missing price environment variable. Valid plans: monthly, quarterly, annual`)
  }
  return priceId
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { plan_id, user_id, user_email } = await req.json()

    // ── Validate inputs ──────────────────────────────────────────────
    if (!plan_id || !user_id || !user_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: plan_id, user_id, user_email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    const validPlans = ["monthly", "quarterly", "annual"]
    if (!validPlans.includes(plan_id)) {
      return new Response(
        JSON.stringify({ error: `Invalid plan_id. Must be one of: ${validPlans.join(", ")}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // ── Initialise Supabase admin client ─────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured")
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── Look up existing Stripe customer for this user ───────────────
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user_id)
      .maybeSingle()

    let customerId = existingSub?.stripe_customer_id as string | null

    // ── Create a Stripe customer if one doesn't exist ────────────────
    if (!customerId) {
      const customer = await stripeRequest("/customers", "POST", {
        email: user_email,
        metadata: { supabase_user_id: user_id },
      })

      if (customer.error) {
        throw new Error(`Failed to create Stripe customer: ${customer.error.message}`)
      }

      customerId = customer.id

      // Save the customer id to subscriptions table (upsert)
      await supabase
        .from("subscriptions")
        .upsert(
          {
            user_id,
            stripe_customer_id: customerId,
            plan_type: plan_id,
            status: "trialing",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
    }

    // ── Build Checkout Session params ────────────────────────────────
    const priceId = getPriceId(plan_id)

    const sessionParams: Record<string, unknown> = {
      customer: customerId!,
      mode: "subscription",
      "payment_method_types[0]": "card",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      success_url: `${Deno.env.get("APP_URL") || "https://cinematch.app"}/pricing?success=true`,
      cancel_url: `${Deno.env.get("APP_URL") || "https://cinematch.app"}/pricing?canceled=true`,
      metadata: { supabase_user_id: user_id, plan_id },
    }

    // Monthly plan gets a 7-day free trial
    if (plan_id === "monthly") {
      sessionParams["subscription_data[trial_period_days]"] = 7
    }

    // ── Create the Checkout Session ──────────────────────────────────
    const session = await stripeRequest("/checkout/sessions", "POST", sessionParams)

    if (session.error) {
      throw new Error(`Failed to create checkout session: ${session.error.message}`)
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("stripe-checkout error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
