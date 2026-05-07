import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Admin password — stored as SHA-256 hash in env var ADMIN_PASSWORD_HASH
// Falls back to plain text ADMIN_PASSWORD if hash not set
const ADMIN_PASSWORD_HASH = Deno.env.get("ADMIN_PASSWORD_HASH")
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")

if (!ADMIN_PASSWORD_HASH && !ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD or ADMIN_PASSWORD_HASH environment variable must be configured")
}

// SHA-256 helper
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// SECURITY: Rate limit admin login attempts per IP
const adminAttempts = new Map<string, number[]>()
const ADMIN_MAX_ATTEMPTS = 10
const ADMIN_WINDOW_MS = 60 * 1000 // 1 minute
const ADMIN_LOCKOUT_MS = 5 * 60 * 1000 // 5 minutes lockout after exceeding limit

function isAdminRateLimited(ip: string): boolean {
  const now = Date.now()
  const attempts = adminAttempts.get(ip)?.filter(t => now - t < ADMIN_WINDOW_MS) || []

  if (attempts.length >= ADMIN_MAX_ATTEMPTS) {
    const lastAttempt = attempts[attempts.length - 1]
    if (now - lastAttempt < ADMIN_LOCKOUT_MS) {
      return true
    }
    adminAttempts.delete(ip)
    return false
  }

  return false
}

function recordAdminAttempt(ip: string): void {
  const now = Date.now()
  const attempts = adminAttempts.get(ip)?.filter(t => now - t < ADMIN_WINDOW_MS) || []
  attempts.push(now)
  adminAttempts.set(ip, attempts)
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
    )
  }

  try {
    const body = await req.json().catch(() => ({}))

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (isAdminRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please wait before trying again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      )
    }

    // Verify admin password — supports both hash and plain text
    let isAuthenticated = false
    const inputPassword = body.admin_password || ''

    if (ADMIN_PASSWORD_HASH) {
      // Compare SHA-256 hash of input with stored hash
      const inputHash = await sha256(inputPassword)
      isAuthenticated = inputHash === ADMIN_PASSWORD_HASH
    } else if (ADMIN_PASSWORD) {
      // Fallback to plain text comparison
      isAuthenticated = inputPassword === ADMIN_PASSWORD
    }

    if (!isAuthenticated) {
      recordAdminAttempt(clientIp)
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    // Reset attempt counter on successful auth
    adminAttempts.delete(clientIp)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch all data in parallel using service role (bypasses RLS)
    const [
      { data: profiles },
      { data: quizResponses },
      { data: subscriptions },
    ] = await Promise.all([
      supabase.from("profiles").select("id, username, xp, level, subscription_status, subscription_plan, email, created_at").order("created_at", { ascending: false }),
      supabase.from("quiz_responses").select("*").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
    ])

    return new Response(
      JSON.stringify({
        profiles: profiles || [],
        quiz_responses: quizResponses || [],
        subscriptions: subscriptions || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("admin-stats error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
