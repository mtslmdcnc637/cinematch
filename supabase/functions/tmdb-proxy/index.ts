import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TMDB_API_BASE = "https://api.themoviedb.org/3"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // JWT Authentication check (optional - allows unauthenticated requests for public data like quiz)
  const authHeader = req.headers.get('Authorization')
  let isAuthenticated = false

  if (authHeader) {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    if (supabaseUrl && supabaseAnonKey) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
      if (!authError && user) {
        isAuthenticated = true
      }
    }
  }
  // Allow unauthenticated requests for public movie data (quiz, landing page)
  // Authenticated users get full access; unauthenticated requests are still served

  try {
    const apiKey = Deno.env.get("TMDB_API_KEY")
    if (!apiKey) {
      throw new Error("TMDB_API_KEY is not configured")
    }

    const { endpoint, params } = await req.json()

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required field: endpoint (e.g., /movie/popular, /search/movie)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Sanitize endpoint: ensure it starts with /
    const sanitizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`

    // Build query string with api_key and optional params
    const queryParams: Record<string, string> = {
      api_key: apiKey,
      ...params,
    }

    const queryString = Object.entries(queryParams)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&")

    const url = `${TMDB_API_BASE}${sanitizedEndpoint}?${queryString}`

    // Forward the request to TMDB
    const tmdbResponse = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const data = await tmdbResponse.json()

    if (!tmdbResponse.ok) {
      return new Response(
        JSON.stringify({
          error: data.status_message || "TMDB API request failed",
          status_code: data.status_code,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: tmdbResponse.status,
        }
      )
    }

    return new Response(
      JSON.stringify(data),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          // Cache popular/trending responses for 5 minutes
          "Cache-Control": endpoint.includes("popular") || endpoint.includes("trending")
            ? "public, max-age=300"
            : "no-cache",
        },
      }
    )
  } catch (error) {
    console.error("tmdb-proxy error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
