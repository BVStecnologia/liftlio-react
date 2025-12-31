# Analise Profunda: Sistema de Emails e Relatorios Liftlio

## Resposta: ANALISE COMPLETA

> **TL;DR**: Sistema de emails robusto com 22 templates, 1 CRON job ativo (weekly_owner_report), MCP Gmail para envio. Precisa de: UI de configuracao no Admin, novos templates de relatorios para usuarios, integracao com Browser Agent para metricas YouTube.

---

## Arquitetura Atual do Sistema de Emails

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SISTEMA DE EMAILS LIFTLIO                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌───────────┐  │
│  │   SQL RPC   │────▶│ Edge Func   │────▶│  MCP Gmail  │────▶│   Gmail   │  │
│  │ send_email()│     │ email-auto- │     │ VPS:3000    │     │    API    │  │
│  └─────────────┘     │ mation-     │     └─────────────┘     └───────────┘  │
│        │             │ engine      │            │                           │
│        │             └─────────────┘            │                           │
│        │                    │                   │                           │
│        ▼                    ▼                   ▼                           │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                    │
│  │  Templates  │     │ email_logs  │     │  Entregue   │                    │
│  │    (22)     │     │ (historico) │     │ ao usuario  │                    │
│  └─────────────┘     └─────────────┘     └─────────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Componentes do Sistema

### 1. SQL Functions (Camada de Orquestracao)

| Funcao | Descricao | Trigger |
|--------|-----------|---------|
| `send_email()` | Core function - envia via Edge Function | Manual/RPC |
| `send_weekly_owner_report()` | Relatorio semanal para owners | CRON Domingo 12h UTC |
| `send_auth_email()` | Emails de autenticacao | Supabase Auth hooks |
| `send_payment_success_email()` | Recibos de pagamento | Trigger payments |
| `send_subscription_status_email()` | Status de assinatura | Trigger subscriptions |
| `send_welcome_email_on_customer_create()` | Welcome email | Trigger customers |
| `send_delayed_notification()` | Notificacao com delay | Trigger status=5 |

### 2. Edge Function: email-automation-engine

**Capacidades:**
- Template rendering com variaveis `{{variavel}}` ou `${variavel}`
- Manipulacao HTML (replace, append, prepend, remove, addClass, addStyle)
- Timeouts dinamicos (simple: 30s, medium: 120s, complex: 400s)
- Logging automatico em `email_logs`
- Sanitizacao HTML via DOMPurify

**Fluxo:**
```
Request → Parse Template → Replace Variables → Process Actions → MCP Gmail → Log
```

### 3. Templates Disponiveis (22)

| Categoria | Templates | Uso Atual |
|-----------|-----------|-----------|
| **Auth** | auth_magic_link, auth_password_reset, auth_welcome, password-reset | Automatico |
| **Payments** | payment-failed, payment-successful, card-expiring-warning | Triggers |
| **Subscriptions** | subscription-confirmation, subscription-suspended, trial-expiring | Triggers |
| **Waitlist** | waitlist-confirmation, waitlist-approval, waitlist-admin-notification | Manual |
| **Engagement** | welcome-email, onboarding-day-1, re-engagement-email, high-impact-mention, mentions-limit-warning | Manual |
| **Admin** | admin-invitation, email-confirmation | Manual |
| **Reports** | weekly_report_no_waitlist, weekly_report_with_waitlist | CRON |

### 4. CRON Jobs Ativos

| Job | Schedule | Comando | Status |
|-----|----------|---------|--------|
| `weekly_owner_report` | `0 12 * * 0` (Dom 12h UTC) | `SELECT send_weekly_owner_report()` | ATIVO |

---

## Metricas Disponiveis para Relatorios

### Dados Atuais do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    METRICAS DISPONIVEIS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  USUARIOS                        ENGAGEMENT                     │
│  ├── 16 usuarios totais          ├── 1,123 mensagens           │
│  └── 0 projetos ativos           ├── 801 respondidas (71%)     │
│                                  └── 679 analytics 7d          │
│                                                                 │
│  BROWSER AGENT                   YOUTUBE                        │
│  ├── 165 tasks completed         ├── 3 replies postadas        │
│  ├── 149 actions                 ├── 6 youtube_reply tasks     │
│  ├── 6 logins                    └── 2 youtube_comment tasks   │
│  └── 5 queries                                                  │
│                                                                 │
│  ADMIN ANALYTICS                 EMAIL LOGS                     │
│  ├── 16 eventos 7d               ├── 8 enviados                │
│  └── Tracking interno            └── 5 falhas                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Metricas por Categoria (para relatorios)

**1. Para ADMIN (Owner Reports):**
- Analytics do site (visitors, sessions, pageviews)
- Waitlist (total, novos)
- Browser Agent usage (tasks, success rate)
- Email delivery stats

**2. Para USUARIOS (User Reports):**
- Mensagens geradas para seu projeto
- Respostas postadas no YouTube
- Videos monitorados
- Engagement (likes recebidos nas respostas)
- Comentarios que ainda existem vs deletados

**3. Para BROWSER AGENT:**
- Horas de trabalho (calculated from task durations)
- Custo total (soma de response.cost_usd)
- Taxa de sucesso por tipo de task
- Videos processados

---

## Fluxo do Relatorio Semanal Atual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   WEEKLY OWNER REPORT (Atual)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  DOMINGO 12:00 UTC (9:00 BRT)                                              │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────────┐                                                        │
│  │ CRON trigger    │                                                        │
│  │ pg_cron         │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────┐               │
│  │ send_weekly_owner_report()                              │               │
│  │                                                         │               │
│  │  1. Query analytics (project_id=117, 7 dias)           │               │
│  │     - unique_visitors                                   │               │
│  │     - total_sessions                                    │               │
│  │     - total_pageviews                                   │               │
│  │                                                         │               │
│  │  2. Query waitlist                                      │               │
│  │     - total_waitlist                                    │               │
│  │     - new_waitlist_count                                │               │
│  │                                                         │               │
│  │  3. Escolhe template                                    │               │
│  │     - weekly_report_with_waitlist (se novos)           │               │
│  │     - weekly_report_no_waitlist (se nao)               │               │
│  │                                                         │               │
│  │  4. Envia para owners                                   │               │
│  │     - valdair3d@gmail.com                              │               │
│  │     - steven@stevenjwilson.com                         │               │
│  └─────────────────────────────────────────────────────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## PROPOSTA: Sistema de Relatorios Customizaveis

### Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 SISTEMA DE RELATORIOS CUSTOMIZAVEIS                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ADMIN DASHBOARD                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  CONFIGURACAO DE EMAILS                                              │  │
│  │  ┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐  │  │
│  │  │ Owner Reports      │ │ User Reports       │ │ System Alerts    │  │  │
│  │  │ ☑ Weekly Summary   │ │ ☑ Weekly Digest    │ │ ☑ Errors         │  │  │
│  │  │ ☑ Waitlist Updates │ │ ☐ Daily Summary    │ │ ☑ Payment Fails  │  │  │
│  │  │ ☑ Browser Agent    │ │ ☑ Reply Success    │ │ ☐ New Signups    │  │  │
│  │  │ ☐ Daily Digest     │ │ ☐ Video Stats      │ │                  │  │  │
│  │  └────────────────────┘ └────────────────────┘ └──────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  TABELAS NECESSARIAS                                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  email_report_config                                                  │  │
│  │  ├── id UUID                                                          │  │
│  │  ├── user_id UUID (null = owner/admin)                               │  │
│  │  ├── report_type VARCHAR (owner_weekly, user_weekly, etc)            │  │
│  │  ├── enabled BOOLEAN                                                  │  │
│  │  ├── frequency VARCHAR (daily, weekly, monthly)                      │  │
│  │  ├── metrics JSONB (quais metricas incluir)                          │  │
│  │  ├── recipients TEXT[] (emails)                                       │  │
│  │  └── schedule VARCHAR (cron expression)                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  NOVA SQL FUNCTION                                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  send_configured_reports()                                            │  │
│  │  ├── Le email_report_config                                          │  │
│  │  ├── Filtra por horario atual                                        │  │
│  │  ├── Busca metricas conforme config                                  │  │
│  │  ├── Renderiza template                                              │  │
│  │  └── Envia via send_email()                                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### User Weekly Report (Para Clientes)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    USER WEEKLY REPORT (Proposta)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  METRICAS DISPONIVEIS (Projeto especifico)                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ENGAGEMENT                                                          │   │
│  │  ├── Novas mensagens encontradas: X                                 │   │
│  │  ├── Respostas geradas pela AI: X                                   │   │
│  │  ├── Respostas postadas no YouTube: X                               │   │
│  │  └── Taxa de aprovacao: X%                                          │   │
│  │                                                                      │   │
│  │  YOUTUBE (via Browser Agent)                                        │   │
│  │  ├── Comentarios que receberam likes: X                             │   │
│  │  ├── Comentarios ainda visiveis: X                                  │   │
│  │  ├── Comentarios deletados: X                                       │   │
│  │  └── Notificacoes do YouTube: X (NOVO - via Browser)                │   │
│  │                                                                      │   │
│  │  VIDEOS MONITORADOS                                                  │   │
│  │  ├── Total de videos: X                                              │   │
│  │  ├── Novos videos esta semana: X                                    │   │
│  │  └── Videos com mais engagement: [lista]                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Browser Agent YouTube Notifications Task

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           BROWSER AGENT: YOUTUBE NOTIFICATIONS CHECK                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  FLUXO PROPOSTO                                                             │
│                                                                             │
│  1. CRON Trigger (ex: semanal)                                             │
│     │                                                                       │
│     ▼                                                                       │
│  2. Para cada projeto com browser_platforms.youtube = true:                │
│     │                                                                       │
│     ▼                                                                       │
│  3. Criar browser_task:                                                     │
│     {                                                                       │
│       "task": "Check YouTube notifications and extract metrics",           │
│       "task_type": "youtube_notifications",                                │
│       "project_id": 123,                                                   │
│       "metadata": {                                                         │
│         "channel_id": "UC...",                                             │
│         "check_types": ["replies", "likes", "mentions"]                    │
│       }                                                                     │
│     }                                                                       │
│     │                                                                       │
│     ▼                                                                       │
│  4. Browser Agent:                                                          │
│     ├── Login no YouTube Studio                                            │
│     ├── Navegar para Notificacoes                                          │
│     ├── Extrair dados estruturados                                         │
│     └── Retornar JSON com metricas                                         │
│     │                                                                       │
│     ▼                                                                       │
│  5. Salvar em nova tabela: youtube_notifications_metrics                   │
│     │                                                                       │
│     ▼                                                                       │
│  6. Incluir no relatorio semanal do usuario                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ESTRUTURA DE IMPLEMENTACAO

### Fase 1: Tabela de Configuracao

```sql
-- email_report_config
CREATE TABLE email_report_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- null = admin
  report_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  frequency VARCHAR(20) DEFAULT 'weekly', -- daily, weekly, monthly
  day_of_week INTEGER, -- 0=Dom, 6=Sab
  hour_utc INTEGER DEFAULT 12,
  metrics JSONB DEFAULT '{}',
  recipients TEXT[],
  template_id UUID REFERENCES email_templates(id),
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de relatorio pre-definidos
INSERT INTO email_report_config (report_type, metrics, recipients) VALUES
('owner_weekly',
 '{"analytics": true, "waitlist": true, "browser_agent": true}',
 ARRAY['valdair3d@gmail.com', 'steven@stevenjwilson.com']),
('user_weekly',
 '{"mensagens": true, "replies": true, "videos": true}',
 NULL); -- cada user configura
```

### Fase 2: UI no Admin Dashboard

```
AdminDashboard.tsx
└── Nova tab: "Email Reports"
    ├── Owner Reports Config
    │   ├── Toggle: Weekly Summary
    │   ├── Toggle: Daily Digest
    │   ├── Checkboxes: Metricas a incluir
    │   └── Recipients list
    ├── User Reports Config (padrao para novos users)
    │   ├── Toggle: Weekly enabled
    │   └── Default metrics
    └── Test Send button
```

### Fase 3: Novos Templates

| Template | Uso | Variaveis |
|----------|-----|-----------|
| `owner_daily_digest` | Digest diario admin | analytics_today, browser_tasks_today |
| `owner_browser_report` | Relatorio Browser Agent | hours_worked, tasks_completed, cost_total |
| `user_weekly_digest` | Digest semanal usuario | mensagens_count, replies_posted, videos_monitored |
| `user_youtube_notifications` | Notificacoes YouTube | replies_received, likes_received, new_subscribers |

### Fase 4: SQL Functions

```sql
-- send_configured_reports() - Master function
-- Executada por CRON a cada hora
-- Verifica quais reports devem ser enviados agora
-- Chama funcao especifica para cada tipo

-- get_owner_metrics(interval) - Metricas para owner
-- get_user_metrics(user_id, interval) - Metricas para user
-- get_browser_agent_metrics(interval) - Metricas Browser Agent
```

### Fase 5: Browser Agent Task Type

```sql
-- Novo task_type: 'youtube_notifications'
-- Comportamento especial para coletar notificacoes
-- Salva resultado estruturado para uso em reports
```

---

## IMPACTO ESTIMADO

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Relatorios automaticos | 1 (owner weekly) | N (configuravel) |
| Personalizacao | Nenhuma | Total via Admin UI |
| Metricas Browser Agent | Nao enviadas | Incluidas em reports |
| User engagement emails | Manual | Automatico semanal |
| YouTube notifications | Nao coletadas | Coletadas via Browser |

---

## PROXIMOS PASSOS (Quando implementar)

1. **Criar tabela `email_report_config`**
2. **Criar UI no AdminDashboard (tab Email Reports)**
3. **Criar novos templates de email**
4. **Criar SQL functions para metricas**
5. **Criar `send_configured_reports()` com CRON**
6. **Implementar task type `youtube_notifications` no Browser Agent**
7. **Testar fluxo completo**

---

## REFERENCIAS TECNICAS

- **Edge Function**: `supabase/functions/email-automation-engine/index.ts`
- **SQL send_email**: `functions_backup/SQL_Functions/09_Email/send_email.sql`
- **Weekly Report**: `functions_backup/SQL_Functions/09_Email/send_weekly_owner_report.sql`
- **CRON Jobs**: `SELECT * FROM cron.job WHERE command ILIKE '%email%'`
- **Templates**: `SELECT * FROM email_templates ORDER BY name`
- **Email Logs**: `SELECT * FROM email_logs ORDER BY created_at DESC`

---

*Analise gerada em 2025-12-28 por Claude Code*
*Este documento e apenas analise - nenhuma implementacao foi feita*
