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
    // ── JWT Authentication ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY is not configured")
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
    const token = authHeader.replace("Bearer ", "")
    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token)

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const { user_id, return_url } = await req.json();

    // SECURITY: user_id is REQUIRED and must match the authenticated user.
    // Never accept a raw customer_id from the request body — always
    // look it up server-side from the authenticated user's subscription.
    if (!user_id || authUser.id !== user_id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      )
    }

    // ── Resolve Stripe customer id from user_id only ─────────────────
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    if (!supabaseServiceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured")
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user_id)
      .maybeSingle()

    const stripeCustomerId = data?.stripe_customer_id as string | undefined

    if (!stripeCustomerId) {
      return new Response(
        JSON.stringify({ error: "No Stripe customer found. Provide customer_id or user_id." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      )
    }

    // ── Create a Billing Portal session ──────────────────────────────
    // SECURITY: Validate return_url to prevent open redirect via Stripe
    const appUrl = Deno.env.get("APP_URL") || "https://mrcine.pro"
    const safeReturnUrl = (return_url && return_url.startsWith(appUrl))
      ? return_url
      : `${appUrl}/pricing`

    const session = await stripePost("/billing_portal/sessions", {
      customer: stripeCustomerId,
      return_url: safeReturnUrl,
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
