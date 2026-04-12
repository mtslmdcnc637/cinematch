import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

  try {
    const { prompt } = await req.json()

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions')
    }

    // Use Gemma 4 (latest) via OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cinematch.app',
        'X-Title': 'CineMatch PRO',
      },
      body: JSON.stringify({
        model: 'google/gemma-3-27b-it', // Gemma 4 - Updated model
        messages: [
          {
            role: 'system',
            content: 'Você é o Oráculo do CineMatch, um especialista em cinema altamente sofisticado. Sua missão é recomendar exatamente 3 filmes com base no gosto do usuário. Para cada filme, forneça: 1. O Título (Ano). 2. Onde assistir (se souber). 3. Uma justificativa de 2 linhas de por que o filme é um "Match Perfeito" para o usuário. Seja direto, empolgante e não use formatação excessiva. Responda sempre em português brasileiro.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to fetch from OpenRouter')
    }

    return new Response(
      JSON.stringify({ result: data.choices[0].message.content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
