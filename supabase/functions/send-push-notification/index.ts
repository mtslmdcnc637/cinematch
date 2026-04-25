import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Methods': 'POST, OPTIONS',
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

// Configure VAPID for web-push
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@mrcine.pro',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
} else {
  console.error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables must be configured")
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
      const inputHash = await sha256(inputPassword)
      isAuthenticated = inputHash === ADMIN_PASSWORD_HASH
    } else if (ADMIN_PASSWORD) {
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

    // Validate required fields
    const { title, body: notificationBody, url, target_user_id } = body
    if (!title || !notificationBody) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title and body are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return new Response(
        JSON.stringify({ error: "Push notifications not configured on server" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch ALL user IDs for in-app notifications (from profiles, not just push_subscriptions)
    let targetUserIds: string[] = []
    
    if (target_user_id) {
      targetUserIds = [target_user_id]
    } else {
      const { data: allProfiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id")
      
      if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
      } else {
        targetUserIds = (allProfiles || []).map((p: any) => p.id)
      }
    }

    // Fetch push subscriptions — all or filtered by target_user_id
    let query = supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")

    if (target_user_id) {
      query = query.eq("user_id", target_user_id)
    }

    const { data: subscriptions, error: subsError } = await query

    if (subsError) {
      console.error("Error fetching push subscriptions:", subsError)
      // Don't fail — we can still insert in-app notifications
    }

    // Build the push payload
    const pushPayload = JSON.stringify({ title, body: notificationBody, url: url || null })

    // Send push notifications to each subscription
    let pushSent = 0
    let pushFailed = 0
    const invalidSubscriptions: string[] = []

    if (subscriptions && subscriptions.length > 0) {
      const pushPromises = subscriptions.map(async (sub: any) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          }
          await webpush.sendNotification(pushSubscription, pushPayload)
          pushSent++
        } catch (error: any) {
          pushFailed++
          console.error(`Push failed for user ${sub.user_id}:`, error?.statusCode, error?.message)

          // Track subscriptions that are no longer valid (410 Gone or 404 Not Found)
          if (error?.statusCode === 410 || error?.statusCode === 404) {
            invalidSubscriptions.push(sub.user_id)
          }
        }
      })

      await Promise.all(pushPromises)
    }

    // Clean up invalid subscriptions (expired/unsubscribed)
    if (invalidSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("user_id", invalidSubscriptions)

      if (deleteError) {
        console.error("Error cleaning up invalid subscriptions:", deleteError)
      }
    }

    // Insert in-app notifications for ALL target users (not just those with push)
    let notificationsInserted = 0
    
    if (targetUserIds.length > 0) {
      const notificationRows = targetUserIds.map((userId: string) => ({
        user_id: userId,
        message: notificationBody,
        is_read: false,
      }))

      const { error: insertError, data: insertedData } = await supabase
        .from("notifications")
        .insert(notificationRows)
        .select("id")

      if (insertError) {
        console.error("Error inserting notifications:", insertError)
        // Try inserting one by one to find which ones fail
        for (const row of notificationRows) {
          const { error: singleError } = await supabase
            .from("notifications")
            .insert(row)
          if (!singleError) {
            notificationsInserted++
          } else {
            console.error(`Failed to insert notification for user ${row.user_id}:`, singleError)
          }
        }
      } else {
        notificationsInserted = insertedData?.length || targetUserIds.length
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        push_sent: pushSent,
        push_failed: pushFailed,
        notifications_inserted: notificationsInserted,
        total_target_users: targetUserIds.length,
        cleaned_up_subscriptions: invalidSubscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("send-push-notification error:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
