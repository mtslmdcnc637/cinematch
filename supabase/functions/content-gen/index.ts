/**
 * content-gen Edge Function
 *
 * Generates social media content suggestions based on a theme/prompt.
 * Returns 2 options of 5 movies each (with TMDB IDs), plus title and bar text.
 *
 * Supports two AI providers:
 * 1. Google AI (Gemma) via GOOGLE_API_KEY — preferred if available (free tier)
 * 2. OpenRouter (DeepSeek) via OPENROUTER_API_KEY — fallback
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

const SYSTEM_PROMPT = `Você é um gerador de conteúdo para redes sociais do MrCine, uma plataforma de recomendação de filmes.
Sua missão é criar sugestões de postagens PARA INSTAGRAM com base no tema solicitado.

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

Regras IMPORTANTES para Instagram:
1. Sempre retorne EXATAMENTE 2 opções com 5 filmes cada.
2. O campo "id_tmdb" é OBRIGATÓRIO e deve ser o ID numérico real do filme no The Movie Database (TMDB).
3. NÃO invente TMDB IDs — use apenas IDs que você tem certeza que estão corretos.
4. PRIORIZE FILMES POPULARES E CONHECIDOS - o público do Instagram precisa reconhecer os filmes rapidamente.
5. FILMES COM AVALIAÇÃO ACIMA DE 7.0 SÃO PREFERÍVEIS - isso gera mais engajamento.
6. Evite filmes muito obscuros ou desconhecidos - foque em sucessos de bilheteria, clássicos reconhecíveis ou filmes premiados.
7. As 2 opções devem ter abordagens diferentes (ex: se o tema for "terror", uma opção pode ser "terror clássico" e outra "terror psicológico").
8. O "texto_barra" será usado como texto destaque no topo da imagem da postagem - deve ser IMPACTANTE e curto.
9. O "titulo" será o texto principal da postagem - deve ser atraente e gerar curiosidade.
10. Responda sempre em português brasileiro.
11. Estamos no ano de 2026. Ao gerar títulos, use 2026 como ano atual (não 2025 ou anterior).
12. Se o usuário pedir filmes de um ano específico, use esse ano. Se pedir "do ano", use 2026.
13. Retorne APENAS o JSON, sem markdown, sem \\`\\`\\`, sem explicação.
14. Dê preferência a filmes com posters visualmente impactantes (ação, sci-fi, fantasia, terror funcionam bem no Instagram).
15. Inclua uma mistura de lançamentos recentes (2023-2026) e clássicos atemporais para maior apelo visual.`

// ─── Google AI (Gemma) Provider ────────────────────────────────────────────────
async function callGoogleAI(prompt: string): Promise<any> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY')
  if (!apiKey || apiKey === 'PLACEHOLDER_FILL_YOUR_KEY') {
    console.log('[content-gen] GOOGLE_API_KEY not configured, skipping')
    return null
  }

  const models = [
    'gemma-3-27b-it',
    'gemma-3-12b-it',
    'gemini-2.0-flash',
  ]

  for (const model of models) {
    try {
      console.log(`[content-gen] Trying Google AI model: ${model}`)
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: SYSTEM_PROMPT },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 2048,
          }
        }),
      })

      const data = await response.json()

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log(`[content-gen] Success with Google AI model: ${model}`)
        // Convert Google AI response to OpenAI-compatible format
        const text = data.candidates[0].content.parts[0].text
        return {
          choices: [{
            message: { content: text }
          }]
        }
      }

      const errMsg = data.error?.message || 'Unknown error'
      console.error(`[content-gen] Google AI model ${model} failed:`, errMsg)
    } catch (e) {
      console.error(`[content-gen] Error with Google AI model ${model}:`, e instanceof Error ? e.message : String(e))
    }
  }

  return null
}

// ─── OpenRouter (DeepSeek) Provider ────────────────────────────────────────────
async function callOpenRouter(prompt: string): Promise<any> {
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    console.log('[content-gen] OPENROUTER_API_KEY not configured, skipping')
    return null
  }

  const models = [
    'deepseek/deepseek-chat-v3-0324',
    'deepseek/deepseek-chat',
  ]

  for (const model of models) {
    try {
      console.log(`[content-gen] Trying OpenRouter model: ${model}`)
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
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
        }),
      })

      const data = await response.json()

      if (response.ok && data.choices) {
        console.log(`[content-gen] Success with OpenRouter model: ${model}`)
        return data
      }

      const rawError = data.error?.message || data.error || 'Unknown error'
      console.error(`[content-gen] OpenRouter model ${model} failed:`, rawError)
    } catch (e) {
      console.error(`[content-gen] Error with OpenRouter model ${model}:`, e instanceof Error ? e.message : String(e))
    }
  }

  return null
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

    // Try Google AI first (free tier), then fall back to OpenRouter
    let data = await callGoogleAI(prompt)

    if (!data) {
      data = await callOpenRouter(prompt)
    }

    if (!data || !data.choices) {
      throw new Error('Nenhuma API de IA disponível. Configure GOOGLE_API_KEY ou OPENROUTER_API_KEY.')
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
