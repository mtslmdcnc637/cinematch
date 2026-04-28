import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "https://esm.sh/web-push@3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Methods': 'POST, OPTIONS',
}

const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD environment variable must be configured")
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

serve(async (req) => {
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

    // Verify admin password
    const inputPassword = body.admin_password || ''
    if (!ADMIN_PASSWORD || inputPassword !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

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

    // Fetch ALL user IDs for in-app notifications
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

    // Fetch push subscriptions
    let query = supabase
      .from("push_subscriptions")
      .select("user_id, endpoint, p256dh, auth")

    if (target_user_id) {
      query = query.eq("user_id", target_user_id)
    }

    const { data: subscriptions, error: subsError } = await query
    if (subsError) {
      console.error("Error fetching push subscriptions:", subsError)
    }

    // Send push notifications
    const pushPayload = JSON.stringify({ title, body: notificationBody, url: url || null })
    let pushSent = 0
    let pushFailed = 0
    const invalidSubscriptions: string[] = []

    if (subscriptions && subscriptions.length > 0) {
      const pushPromises = subscriptions.map(async (sub: any) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          }
          await webpush.sendNotification(pushSubscription, pushPayload)
          pushSent++
        } catch (error: any) {
          pushFailed++
          if (error?.statusCode === 410 || error?.statusCode === 404) {
            invalidSubscriptions.push(sub.user_id)
          }
        }
      })
      await Promise.all(pushPromises)
    }

    // Clean up invalid subscriptions
    if (invalidSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("user_id", invalidSubscriptions)
    }

    // Insert in-app notifications
    let notificationsInserted = 0
    let insertErrorDetail: string | null = null
    
    if (targetUserIds.length > 0) {
      const notificationRows = targetUserIds.map((userId: string) => ({
        user_id: userId,
        sender_id: null,
        type: 'admin',
        movie_id: 0,
        movie_title: '',
        message: notificationBody,
        is_read: false,
      }))

      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notificationRows)

      if (insertError) {
        insertErrorDetail = JSON.stringify(insertError)
        console.error("Batch insert error:", insertErrorDetail)
        
        // Try inserting one by one
        for (const row of notificationRows) {
          const { error: singleError } = await supabase
            .from("notifications")
            .insert(row)
          if (!singleError) {
            notificationsInserted++
          } else {
            console.error("Single insert error:", JSON.stringify(singleError))
          }
        }
      } else {
        notificationsInserted = targetUserIds.length
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
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
