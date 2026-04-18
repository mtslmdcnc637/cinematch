/**
 * content-gen Edge Function
 *
 * Generates social media content suggestions based on a theme/prompt.
 * Returns 2 options of 5 movies each (with TMDB IDs), plus title and bar text.
 * Uses OpenRouter API (same as oracle) for AI generation.
 *
 * Auth: admin_password (same as admin-stats) — no JWT required.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function verifyPassword(input: string): Promise<boolean> {
  const ADMIN_PASSWORD_HASH = Deno.env.get('ADMIN_PASSWORD_HASH');
  const ADMIN_PASSWORD = Deno.env.get('ADMIN_PASSWORD');

  if (ADMIN_PASSWORD_HASH) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === ADMIN_PASSWORD_HASH;
  }
  return input === ADMIN_PASSWORD;
}

function sanitizeApiError(message: string): string {
  return message
    .replace(/\bHTTP\s*\d{3}\b/gi, '')
    .replace(/\bstatus\s*:?\s*\d{3}\b/gi, '')
    .replace(/\bcode\s*:?\s*\d{3}\b/gi, '')
    .replace(/\bError\s*\d{3}\b/gi, '')
    .trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    )
  }

  try {
    const { admin_password, prompt } = await req.json()

    // Verify admin password
    if (!admin_password || !(await verifyPassword(admin_password))) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY não configurada')
    }

    const models = [
      'deepseek/deepseek-chat-v3-0324',
      'deepseek/deepseek-chat',
    ]

    let lastError: Error | null = null
    let data: any = null

    for (const model of models) {
      try {
        console.log(`[content-gen] Trying model: ${model}`)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mrcine.pro',
            'X-Title': 'MrCine Content Generator',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: `Você é um gerador de conteúdo para redes sociais do MrCine, uma plataforma de recomendação de filmes.
Sua missão é criar sugestões de postagens para Instagram e TikTok com base no tema solicitado.

IMPORTANTE: Você DEVE responder EXCLUSIVAMENTE com um JSON válido, sem nenhum texto adicional antes ou depois.

O JSON deve seguir EXATAMENTE esta estrutura:
{
  "opcoes": [
    {
      "titulo": "Título chamativo para a postagem (máx 50 caracteres)",
      "texto_barra": "TEXTO CURTO PRA BARRA (máx 20 caracteres, em CAPS)",
      "filmes": [
        { "id_tmdb": 12345, "posicao": 1 },
        { "id_tmdb": 67890, "posicao": 2 },
        { "id_tmdb": 11111, "posicao": 3 },
        { "id_tmdb": 22222, "posicao": 4 },
        { "id_tmdb": 33333, "posicao": 5 }
      ]
    },
    {
      "titulo": "Outro título chamativo",
      "texto_barra": "OUTRO TEXTO CURTO",
      "filmes": [...]
    }
  ]
}

Regras:
1. Sempre retorne EXATAMENTE 2 opções com 5 filmes cada.
2. O campo "id_tmdb" é OBRIGATÓRIO e deve ser o ID numérico real do filme no The Movie Database (TMDB).
3. NÃO invente TMDB IDs — use apenas IDs que você tem certeza que estão corretos. Prefira filmes populares e conhecidos.
4. As 2 opções devem ter abordagens diferentes (ex: se o tema for "terror", uma opção pode ser "terror clássico" e outra "terror psicológico").
5. O "texto_barra" será usado como texto destaque no topo da imagem da postagem.
6. O "titulo" será o texto principal da postagem.
7. Responda sempre em português brasileiro.
8. Retorne APENAS o JSON, sem markdown, sem \`\`\`, sem explicação.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8,
          }),
        })

        const responseData = await response.json()

        if (response.ok) {
          data = responseData
          console.log(`[content-gen] Success with model: ${model}`)
          break
        }

        const rawError = responseData.error?.message || responseData.error || 'Unknown error'
        lastError = new Error(sanitizeApiError(String(rawError)))
        console.error(`[content-gen] Model ${model} failed:`, rawError)
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        console.error(`[content-gen] Error with model ${model}:`, lastError.message)
      }
    }

    if (!data || !data.choices) {
      throw new Error(
        lastError
          ? `Erro ao gerar conteúdo: ${sanitizeApiError(lastError.message)}`
          : 'Erro ao gerar conteúdo. Tente novamente.'
      )
    }

    const rawContent = data.choices[0].message.content.trim()

    // Parse JSON (handle markdown code blocks)
    let parsed
    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '')
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { raw_text: rawContent, opcoes: [] }
    }

    return new Response(
      JSON.stringify({ result: parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[content-gen] Fatal error:', message)
    return new Response(
      JSON.stringify({ error: sanitizeApiError(message) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
