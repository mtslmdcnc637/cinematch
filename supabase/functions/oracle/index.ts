import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory rate limiter: userId → [timestamps]
const oracleCalls = new Map<string, number[]>()
const ORACLE_MAX_CALLS = 10
const ORACLE_WINDOW_MS = 60 * 1000 // 1 minute

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const calls = oracleCalls.get(userId)?.filter(t => now - t < ORACLE_WINDOW_MS) || []
  if (calls.length >= ORACLE_MAX_CALLS) return true
  oracleCalls.set(userId, [...calls, now])
  return false
}

/**
 * Sanitize error messages from external APIs (OpenRouter) to prevent
 * leaking HTTP status codes or sensitive info to the client.
 * The client uses `msg.includes('401')` to detect auth failures, so we
 * must strip status codes from upstream error messages to avoid false positives.
 */
function sanitizeApiError(message: string): string {
  // Remove common patterns like "HTTP 401", "status 401", "code 401"
  return message
    .replace(/\bHTTP\s*\d{3}\b/gi, '')
    .replace(/\bstatus\s*:?\s*\d{3}\b/gi, '')
    .replace(/\bcode\s*:?\s*\d{3}\b/gi, '')
    .replace(/\bError\s*\d{3}\b/gi, '')
    .trim()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // JWT Authentication check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing Authorization header' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Server configuration error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  // Rate limit check
  if (isRateLimited(user.id)) {
    return new Response(
      JSON.stringify({ error: 'Limite de consultas atingido. Tente novamente em instantes.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
    )
  }

  // SECURITY: Verify user has an active PRO subscription before consuming API credits
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (supabaseServiceKey) {
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: sub } = await adminClient
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!sub) {
      return new Response(
        JSON.stringify({ error: 'Assinatura PRO requerida para usar o Oráculo. Assine em mrcine.pro/pricing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }
  }

  try {
    const { prompt } = await req.json()

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    if (!apiKey) {
      console.error('[oracle] OPENROUTER_API_KEY is not configured')
      throw new Error('Serviço de IA temporariamente indisponível. Tente novamente mais tarde.')
    }

    // Use deepseek-chat-v3 via OpenRouter — cheap, recent, good film knowledge
    // Fallback models if primary is unavailable
    const models = [
      'deepseek/deepseek-chat-v3-0324',
      'deepseek/deepseek-chat',
      'google/gemini-2.0-flash-001',
    ]

    let lastError: Error | null = null
    let data: any = null

    for (const model of models) {
      try {
        console.log(`[oracle] Trying model: ${model}`)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mrcine.pro',
            'X-Title': 'MrCine PRO',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: `Você é o Oráculo do MrCine, um especialista em cinema altamente sofisticado.
Sua missão é recomendar exatamente 3 filmes com base no gosto do usuário.

IMPORTANTE: Você DEVE responder EXCLUSIVAMENTE com um JSON válido, sem nenhum texto adicional antes ou depois. O JSON deve seguir exatamente esta estrutura:
{
  "summary": "Um parágrafo curto (2-3 frases) resumindo a análise do perfil e as recomendações",
  "movies": [
    {
      "title": "Nome do Filme",
      "year": 2024,
      "tmdb_id": 12345,
      "reason": "Uma justificativa de 1-2 frases de por que este filme é perfeito para o usuário"
    }
  ]
}

Regras:
1. O campo "tmdb_id" é OBRIGATÓRIO e deve ser o ID numérico real do filme no The Movie Database (TMDB).
2. Não invente TMDB IDs — use apenas IDs que você tem certeza que estão corretos.
3. Se não souber o TMDB ID de um filme, coloque 0 (zero) e o título será usado para busca.
4. Responda sempre em português brasileiro.
5. O "reason" deve ser empolgante e personalizado.
6. Retorne APENAS o JSON, sem markdown, sem \`\`\`, sem explicação.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
          }),
        })

        const responseData = await response.json()

        if (response.ok) {
          data = responseData
          console.log(`[oracle] Success with model: ${model}`)
          break
        }

        // Model failed — sanitize error and try next
        const rawError = responseData.error?.message || responseData.error || 'Unknown error'
        lastError = new Error(sanitizeApiError(String(rawError)))
        console.error(`[oracle] Model ${model} failed:`, rawError)
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        console.error(`[oracle] Error with model ${model}:`, lastError.message)
      }
    }

    if (!data || !data.choices) {
      throw new Error(
        lastError
          ? `Erro ao consultar a IA: ${sanitizeApiError(lastError.message)}`
          : 'Erro ao consultar a IA. Tente novamente em alguns minutos.'
      )
    }

    const rawContent = data.choices[0].message.content.trim()

    // Try to parse as JSON (handle possible markdown code blocks)
    let parsed
    try {
      // Remove potential markdown code block wrappers
      const cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
      parsed = JSON.parse(cleaned)
    } catch {
      // If JSON parsing fails, wrap the plain text as a fallback
      parsed = {
        summary: '',
        movies: [],
        fallback_text: rawContent
      }
    }

    return new Response(
      JSON.stringify({ result: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[oracle] Fatal error:', message)
    return new Response(
      JSON.stringify({ error: sanitizeApiError(message) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
