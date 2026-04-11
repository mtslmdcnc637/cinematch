import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    
    // Get the API key from Supabase Environment Variables
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured in Supabase Edge Functions')
    }

    // Call OpenRouter API using Google's Gemma model
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://cinematch.app', // Your site URL
        'X-Title': 'CineMatch PRO', // Your site name
      },
      body: JSON.stringify({
        model: 'google/gemma-2-9b-it', // Using Gemma 2 (Fast and excellent for reasoning)
        messages: [
          { 
            role: 'system', 
            content: 'Você é o Oráculo do CineMatch, um especialista em cinema altamente sofisticado. Sua missão é recomendar exatamente 3 filmes com base no gosto do usuário. Para cada filme, forneça: 1. O Título (Ano). 2. Onde assistir (se souber). 3. Uma justificativa de 2 linhas de por que o filme é um "Match Perfeito" para o usuário. Seja direto, empolgante e não use formatação excessiva.' 
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
