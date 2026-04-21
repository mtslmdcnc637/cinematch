# MrCine Pro — Fase 1: Status Completo

**Data de conclusão:** 2026-04-20
**Status:** ✅ CONCLUÍDA

---

## O que foi implementado

### 1. PostgreSQL na VPS
- PostgreSQL 16 instalado e rodando na VPS (localhost:5432)
- Usuário do banco: `mrcine` / Senha: `REDACTED_DB_PASSWORD`
- Banco: `mrcine_producers`
- Banco é INDEPENDENTE do Supabase (zero impacto nos dados existentes)

### 2. Tabelas criadas

| Tabela | Descrição |
|--------|-----------|
| `producers` | Produtores/influenciadores (username, bio, pix_key, stripe_connect_id, status, role, commission_rate) |
| `producer_lists` | Listas de filmes dos produtores (title, movie_ids[], movie_data jsonb, slug, is_published) |
| `referral_links` | Links de referral únicos por produtor (code, discount_percent=15, click_count, conversion_count) |
| `referrals` | Rastreamento de visitantes via cookie (visitor_fingerprint, source, converted, expires_at 7 dias) |
| `commissions` | Comissões dos produtores (gross_amount_cents, commission_rate, status, stripe_transfer_id) |
| `payouts` | Pagamentos/saques dos produtores (amount_cents, method=pix, status) |

**Indexes e constraints:**
- UNIQUE em `producers.username` e `producers.custom_slug`
- UNIQUE em `referral_links.code`
- UNIQUE em `producer_lists(producer_id, slug)`
- FK cascades em producer_lists → producers
- Trigger `update_updated_at` em producers e producer_lists

### 3. API de Produtores (Image Service)

**Arquivo:** `/var/www/cinematch/image-service/mrcine-producer-routes.js`
**Montado em:** `/api/producer/` (via nginx proxy → localhost:3001/producer/)

| Endpoint | Método | Auth | Descrição |
|----------|--------|------|-----------|
| `/producer/health` | GET | - | Health check do PostgreSQL |
| `/producer/stats` | GET | Admin | Dashboard stats |
| `/producer/producers` | GET | Admin | Listar produtores |
| `/producer/producers/:username` | GET | - | Buscar produtor (dados públicos) |
| `/producer/producers` | POST | Admin | Criar produtor (+ referral link automático) |
| `/producer/producers/:id` | PATCH | Admin | Atualizar produtor |
| `/producer/producers/:id/approve` | POST | Admin | Aprovar produtor |
| `/producer/producers/:username/lists` | GET | - | Listas do produtor |
| `/producer/producers/:username/lists` | POST | Admin | Criar lista |
| `/producer/commissions/:username` | GET | Admin | Comissões do produtor |
| `/producer/referral-links` | POST | Admin | Criar link de referral |
| `/producer/backup` | GET | Admin | Download backup PostgreSQL (.sql.gz) |
| `/producer/cleanup` | POST | Admin | Limpar referrals expirados |

**Auth:** Header `x-admin-password: REDACTED_ADMIN_PASSWORD`

### 4. Módulo de DB (PostgreSQL client)

**Arquivo:** `/var/www/cinematch/image-service/mrcine-db.js`
- Pool de conexões com pg
- Funções para CRUD de todas as tabelas
- Dashboard stats agregadas
- Cleanup de referrals expirados

### 5. Backup Automático

- **Script:** `/usr/local/bin/mrcine-backup.sh`
- **Cron:** `0 3 * * *` (todo dia às 03:00 UTC)
- **Diretório:** `/backup/postgresql/`
- **Formato:** `mrcine_producers_YYYYMMDD_HHMMSS.sql.gz`
- **Retenção:** Últimos 30 backups (limpeza automática)
- **Log:** `/var/log/mrcine-backup.log`

### 6. Botão de Backup no Dashboard

- Nova tab **"Sistema"** no dashboard admin (`/dashboard`)
- Mostra health check do PostgreSQL em tempo real
- Botão "Baixar Backup Agora" → gera e baixa .sql.gz instantaneamente
- Informações sobre o sistema (tabelas, diretórios, cron)

### 7. Service Systemd

**Arquivo:** `/etc/systemd/system/mrcine-image-service.service`
- Service: `mrcine-image-service` (active, running)
- Working dir: `/var/www/cinematch/image-service`
- Env vars: PG_HOST, PG_PORT, PG_DATABASE, PG_USER, PG_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY, ADMIN_PASSWORD, PORT

---

## Credenciais Importantes

> ⚠️ Credenciais sensíveis NÃO são versionadas. Consulte o arquivo local na VPS ou o dashboard admin.

---

## Arquitetura Híbrida

```
mrcine.pro
├── Supabase (cloud) — NÃO ALTERADO
│   ├── auth (logins, sessões)
│   ├── profiles (dados de usuário)
│   ├── subscriptions (assinaturas Stripe)
│   ├── secret_codes (códigos secretos)
│   ├── quiz_responses (respostas do quiz)
│   ├── friends, ratings, watchlist
│   └── edge functions (admin-stats, content-gen, tmdb-proxy, etc.)
│
└── PostgreSQL VPS (localhost) — NOVO
    ├── producers (produtores/influenciadores)
    ├── producer_lists (listas de filmes)
    ├── referral_links (links de referral)
    ├── referrals (rastreamento de visitantes)
    ├── commissions (comissões)
    └── payouts (pagamentos)
```

---

## Próxima Fase: Fase 2

**Stripe Connect Express + Referral Cookie Tracking**

1. Configurar Stripe Connect Express no backend
2. Implementar cookie de referral (7 dias) no frontend
3. Cupom de desconto automático no checkout
4. Webhook para registrar comissão quando assinatura é criada
5. Página pública do produtor (`/p/:username`)

**Dependências da Fase 2:**
- Stripe Account (chaves de API)
- Webhook endpoint no image service
- Frontend: detectar `?ref=CODE` e setar cookie
- Stripe Checkout integration com coupon
