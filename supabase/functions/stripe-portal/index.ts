import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STRIPE_API_BASE = "https://api.stripe.com/v1"

// Helper: make an authenticated POST request to the Stripe REST API
async function stripePost(path: string, body: Record<string, string>) {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY")
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured")

  const encoded = Object.entries(body)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")

  const res = await fetch(`${STRIPE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encoded,
  })

  return res.json()
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { customer_id, user_id, return_url } = await req.json()

    // ── Resolve Stripe customer id ───────────────────────────────────
    let stripeCustomerId = customer_id as string | undefined

    if (!stripeCustomerId && user_id) {
      // Look up from subscriptions table
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured")
      }
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      const { data, error } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", user_id)
        .maybeSingle()

      if (error) {
        throw new Error(`Failed to look up customer: ${error.message}`)
      }

      stripeCustomerId = data?.stripe_customer_id
    }

    if (!stripeCustomerId) {
      return new Response(
        JSON.stringify({ error: "No Stripe customer found. Provide customer_id or user_id." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      )
    }

    // ── Create a Billing Portal session ──────────────────────────────
    const returnUrl = return_url || `${Deno.env.get("APP_URL") || "https://cinematch.app"}/pricing`

    const session = await stripePost("/billing_portal/sessions", {
      customer: stripeCustomerId,
      return_url: returnUrl,
    })

    if (session.error) {
      throw new Error(`Failed to create portal session: ${session.error.message}`)
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("stripe-portal error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
