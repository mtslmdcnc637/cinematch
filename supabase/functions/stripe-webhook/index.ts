import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Stripe Webhook Signature Verification ─────────────────────────────────
// Replicates the Stripe Node SDK's verifyWebhookSignature logic using
// Web Crypto API (available in Deno runtime).

async function verifyStripeSignature(
  payload: string,
  header: string,
  secret: string,
  toleranceSec = 300
): Promise<{ verified: boolean; event: unknown }> {
  // Parse the Stripe-Signature header
  const parts: Record<string, string> = {}
  header.split(",").forEach((segment) => {
    const [key, value] = segment.split("=")
    parts[key.trim()] = value.trim()
  })

  const timestamp = parts["t"]
  const signature = parts["v1"]
  if (!timestamp || !signature) {
    throw new Error("Invalid Stripe signature header format")
  }

  // Check timestamp freshness
  const timestampMs = parseInt(timestamp, 10) * 1000
  const nowMs = Date.now()
  if (Math.abs(nowMs - timestampMs) > toleranceSec * 1000) {
    throw new Error("Stripe webhook timestamp outside tolerance zone")
  }

  // Compute expected signature: HMAC-SHA256(secret, "timestamp.rawPayload")
  const signedPayload = `${timestamp}.${payload}`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signatureBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  )
  // Convert to hex string
  const expectedSig = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  if (expectedSig !== signature) {
    throw new Error("Stripe webhook signature verification failed")
  }

  return { verified: true, event: JSON.parse(payload) }
}

// ── Determine plan_type from a Stripe price id ────────────────────────────
function planTypeFromPriceId(priceId: string): string {
  const monthly = Deno.env.get("STRIPE_PRICE_MONTHLY")
  const quarterly = Deno.env.get("STRIPE_PRICE_QUARTERLY")
  const annual = Deno.env.get("STRIPE_PRICE_ANNUAL")

  if (priceId === monthly) return "monthly"
  if (priceId === quarterly) return "quarterly"
  if (priceId === annual) return "annual"

  // Fallback – return the raw price id; caller can handle
  return "monthly"
}

// ── Update the profiles table subscription_status for quick lookup ─────────
async function updateProfileSubscription(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  planType: string,
  status: string
) {
  await supabase
    .from("profiles")
    .update({
      subscription_status: status,
      subscription_plan: planType,
    })
    .eq("id", userId)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured")
    }

    // Read raw body *before* parsing – needed for signature verification
    const rawBody = await req.text()
    const sigHeader = req.headers.get("stripe-signature")
    if (!sigHeader) {
      return new Response(
        JSON.stringify({ error: "Missing stripe-signature header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Verify signature
    const { event } = await verifyStripeSignature(rawBody, sigHeader, webhookSecret)

    // ── Initialise Supabase admin client ─────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured")
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const eventType = (event as any).type
    console.log(`Processing Stripe event: ${eventType}`)

    switch (eventType) {
      // ────────────────────────────────────────────────────────────────
      // CHECKOUT SESSION COMPLETED
      // ────────────────────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = (event as any).data.object
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string
        const userId = session.metadata?.supabase_user_id as string | undefined
        const planId = session.metadata?.plan_id as string | undefined

        if (!userId) {
          console.error("checkout.session.completed: missing supabase_user_id in metadata")
          break
        }

        // Retrieve the subscription object to get period dates & price
        const secretKey = Deno.env.get("STRIPE_SECRET_KEY")!
        const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        })
        const subData = await subRes.json()

        const priceId = subData.items?.data?.[0]?.price?.id as string | undefined
        const planType = planId || (priceId ? planTypeFromPriceId(priceId) : "monthly")
        const status = subData.status || "active"
        const periodStart = subData.current_period_start
          ? new Date(subData.current_period_start * 1000).toISOString()
          : null
        const periodEnd = subData.current_period_end
          ? new Date(subData.current_period_end * 1000).toISOString()
          : null

        // Upsert subscription in DB
        const { error: subError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plan_type: planType,
              status,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "stripe_subscription_id" }
          )
        if (subError) console.error("DB upsert error (checkout):", subError)

        // Update profile for quick lookup
        await updateProfileSubscription(supabase, userId, planType, status)
        break
      }

      // ────────────────────────────────────────────────────────────────
      // CUSTOMER SUBSCRIPTION UPDATED
      // ────────────────────────────────────────────────────────────────
      case "customer.subscription.updated": {
        const sub = (event as any).data.object
        const subscriptionId = sub.id as string
        const customerId = sub.customer as string
        const status = sub.status as string
        const priceId = sub.items?.data?.[0]?.price?.id as string | undefined
        const planType = priceId ? planTypeFromPriceId(priceId) : "monthly"
        const periodStart = sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null
        const cancelAtPeriodEnd = sub.cancel_at_period_end ?? false

        // Find user by stripe_customer_id
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()

        if (!existingSub) {
          console.error("subscription.updated: no subscription found for customer", customerId)
          break
        }

        const userId = existingSub.user_id

        const { error } = await supabase
          .from("subscriptions")
          .update({
            stripe_subscription_id: subscriptionId,
            plan_type: planType,
            status,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
        if (error) console.error("DB update error (sub updated):", error)

        await updateProfileSubscription(supabase, userId, planType, status)
        break
      }

      // ────────────────────────────────────────────────────────────────
      // CUSTOMER SUBSCRIPTION DELETED
      // ────────────────────────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = (event as any).data.object
        const customerId = sub.customer as string

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()

        if (!existingSub) {
          console.error("subscription.deleted: no subscription found for customer", customerId)
          break
        }

        const userId = existingSub.user_id

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
        if (error) console.error("DB update error (sub deleted):", error)

        await updateProfileSubscription(supabase, userId, "free", "canceled")
        break
      }

      // ────────────────────────────────────────────────────────────────
      // INVOICE PAYMENT FAILED
      // ────────────────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = (event as any).data.object
        const customerId = invoice.customer as string

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("user_id, plan_type")
          .eq("stripe_customer_id", customerId)
          .maybeSingle()

        if (!existingSub) {
          console.error("invoice.payment_failed: no subscription found for customer", customerId)
          break
        }

        const userId = existingSub.user_id
        const planType = existingSub.plan_type || "monthly"

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
        if (error) console.error("DB update error (payment failed):", error)

        await updateProfileSubscription(supabase, userId, planType, "past_due")
        break
      }

      default:
        console.log(`Unhandled event type: ${eventType}`)
    }

    // Always return 200 so Stripe doesn't retry
    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("stripe-webhook error:", error)
    // Always return 200 to prevent Stripe retries for non-recoverable errors
    return new Response(
      JSON.stringify({ received: true, error: error.message || "Webhook handler error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  }
})
