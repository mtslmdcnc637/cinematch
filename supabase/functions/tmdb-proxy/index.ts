import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TMDB_API_BASE = "https://api.themoviedb.org/3"

// Allowed TMDB endpoints (prevent arbitrary API calls)
// SECURITY: Only allow specific read-only endpoints. The generic "movie/" pattern
// is replaced with a regex that only allows movie/{numeric_id} and specific sub-paths.
const ALLOWED_ENDPOINTS = [
  "movie/popular",
  "movie/now_playing",
  "movie/top_rated",
  "movie/upcoming",
  "search/movie",
  "discover/movie",
  "trending/movie/week",
  "trending/movie/day",
  "genre/movie/list",
]

// Regex for movie/{id} and movie/{id}/{sub-resource} (read-only)
const MOVIE_ID_REGEX = /^movie\/\d+(?:\/videos|\/watch\/providers|\/similar|\/credits|\/reviews)?$/

function isEndpointAllowed(endpoint: string): boolean {
  const clean = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint
  // Check explicit allowlist
  if (ALLOWED_ENDPOINTS.some(allowed => clean === allowed || clean.startsWith(allowed + "?"))) {
    return true
  }
  // Check movie/{id} pattern
  return MOVIE_ID_REGEX.test(clean)
}

// Simple in-memory rate limiter per IP
const requestCounts = new Map<string, number[]>()
const MAX_REQUESTS = 60
const WINDOW_MS = 60 * 1000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const calls = requestCounts.get(ip)?.filter(t => now - t < WINDOW_MS) || []
  if (calls.length >= MAX_REQUESTS) return true
  requestCounts.set(ip, [...calls, now])
  return false
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get("TMDB_API_KEY")
    if (!apiKey) {
      throw new Error("TMDB_API_KEY is not configured")
    }

    // Rate limiting by IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown"
    if (isRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Tente novamente em instantes." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      )
    }

    // Validate apikey header
    const requestApiKey = req.headers.get("apikey")
    if (!requestApiKey || !requestApiKey.startsWith("eyJ")) {
      console.error("Invalid or missing apikey header")
      return new Response(
        JSON.stringify({ error: "Invalid apikey" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const { endpoint, params } = await req.json()

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing required field: endpoint (e.g., movie/popular, search/movie)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Endpoint allowlist check
    if (!isEndpointAllowed(endpoint)) {
      return new Response(
        JSON.stringify({ error: "Endpoint not allowed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      )
    }

    // Sanitize endpoint: ensure it starts with /
    const sanitizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`

    // Build query string with api_key and optional params
    // SECURITY: Delete api_key from user-supplied params to prevent override
    const safeParams = { ...params }
    delete safeParams.api_key
    delete safeParams.api_key_local

    const queryParams: Record<string, string> = {
      api_key: apiKey,
      ...safeParams,
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
    const message = error instanceof Error ? error.message : "Internal server error"
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
