# MrCine Pro — Fase 2: Status Completo

**Data de conclusão:** 2026-04-20
**Status:** ✅ CONCLUÍDA

---

## O que foi implementado

### 1. Cookie de Referral (Frontend)

**Arquivo:** `src/Router.tsx`

- Componente `ReferralTracker` detecta `?ref=CODE` na URL
- Seta cookie `mrcine_ref` com validade de 7 dias
- Fallback em `localStorage` caso cookie seja bloqueado
- Registra o clique no backend via POST `/api/producer/referral-click`
- Trackea evento `referral_click` no GA4
- Remove `?ref=CODE` da URL (para compartilhamento limpo)
- Função `getReferralCode()` exportada para uso no checkout

**Fluxo:**
1. Visitante acessa `mrcine.pro/?ref=FILMES20`
2. ReferralTracker detecta o `ref=FILMES20`
3. Seta cookie de 7 dias + localStorage
4. Chama API para registrar clique (incrementa contador)
5. URL fica `mrcine.pro/` (limpa)
6. Quando a pessoa assina, o cookie é lido e enviado ao Stripe

### 2. API de Referral Click (Backend)

**Arquivo:** `image-service/mrcine-producer-routes.js`

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/producer/referral-click` | POST | Pública | Registra clique no referral link |
| `/producer/validate-ref/:code` | GET | Pública | Valida se código de referral é válido |
| `/producer/commissions` | POST | Admin | Cria comissão (usado pelo Stripe webhook) |

**No referral-click:**
- Busca o referral link pelo código
- Incrementa `click_count` no link e `total_clicks` no produtor
- Cria registro na tabela `referrals` com fingerprint + expiry de 7 dias
- Retorna o `discount_percent` do link

### 3. Cupom de Desconto no Checkout (Stripe)

**Arquivo:** `supabase/functions/stripe-checkout/index.ts`

- Aceita `ref_code` no body do request
- Valida o código contra a API do VPS (`/validate-ref/:code`)
- Se válido, cria um coupon temporário no Stripe com o desconto do produtor
- Aplica o coupon no Checkout Session
- Inclui `ref_code` e `ref_producer` nos metadados da sessão

**Desconto padrão:** 15% no primeiro mês (configurável por link)

### 4. Registro de Comissão no Webhook (Stripe)

**Arquivo:** `supabase/functions/stripe-webhook/index.ts`

No evento `checkout.session.completed`:
- Verifica se `ref_code` existe nos metadados
- Busca dados do produtor na API do VPS
- Calcula comissão (rate do produtor: creator 30%, affiliate 20%)
- Registra comissão via POST `/producer/commissions`
- Atualiza: referral (converted=true), referral_link (conversion_count++), producer (total_referrals++, total_earnings++)

### 5. QuizApp envia ref_code no checkout

**Arquivo:** `src/components/quiz/QuizApp.tsx`

- Importa `getReferralCode` do Router
- Ao criar sessão de checkout, envia `ref_code` no body

---

## Fluxo Completo do Referral

```
Produtor compartilha: mrcine.pro/?ref=FILMES20
    ↓
Visitante acessa → ReferralTracker detecta ?ref=
    ↓
Cookie mrcine_ref=FILMES20 (7 dias) + localStorage
    ↓
POST /api/producer/referral-click (registra clique)
    ↓
Visitante faz quiz → cria conta → escolhe plano
    ↓
stripe-checkout lê cookie → valida código → cria cupom 15%
    ↓
Checkout Stripe com desconto aplicado
    ↓
Pagamento confirmado → stripe-webhook dispara
    ↓
Webhook registra comissão (30% creator / 20% affiliate)
    ↓
Produtor pode ver comissão no dashboard
```

---

## Próxima Fase: Fase 3

**Página Pública do Produtor + Dashboard do Produtor**

1. Rota `/p/:username` com perfil público do produtor
2. Lista de filmes do produtor (preview blurado para não-assinantes)
3. Dashboard do produtor (métricas, comissões, saques)
4. Stripe Connect Express onboarding
