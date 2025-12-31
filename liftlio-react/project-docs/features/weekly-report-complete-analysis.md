# Analise Completa: Sistema de Reports Semanais

## Status: ANALISE PROFUNDA COMPLETA

> **TL;DR**: O sistema atual usa `analytics` (externo) corretamente para liftlio.com.
> Proposta: Adicionar simulacoes ao report + criar reports por projeto para assinantes.

---

## 1. Arquitetura de Analytics (Duas Tabelas Separadas)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE ANALYTICS DO LIFTLIO                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐        │
│  │     analytics (EXTERNO)     │    │  admin_analytics (INTERNO)  │        │
│  │                             │    │                             │        │
│  │  Fonte: track.liftlio.com   │    │  Fonte: React App direto    │        │
│  │  (VPS 173.249.22.2)         │    │  (useAdminTracking hook)    │        │
│  │                             │    │                             │        │
│  │  Rastreia:                  │    │  Rastreia:                  │        │
│  │  - Visitantes do SITE       │    │  - Usuarios LOGADOS         │        │
│  │  - liftlio.com (publico)    │    │  - Dashboard interno        │        │
│  │  - Landing page             │    │  - Navegacao no app         │        │
│  │  - Blog                     │    │                             │        │
│  │                             │    │                             │        │
│  │  project_id = 117           │    │  Sem project_id             │        │
│  │                             │    │  (sempre interno)           │        │
│  │                             │    │                             │        │
│  │  Dados 7 dias:              │    │  Dados 7 dias:              │        │
│  │  - 15 visitors              │    │  - 2 visitors               │        │
│  │  - 125 sessions             │    │  - 10 sessions              │        │
│  │  - 238 pageviews            │    │  - 69 pageviews             │        │
│  └─────────────────────────────┘    └─────────────────────────────┘        │
│                                                                             │
│  CONCLUSAO: O weekly report DEVE usar `analytics` (externo)                │
│             pois mostra visitantes do SITE, nao do app.                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Sistema Atual de Weekly Report

### Funcao: `send_weekly_owner_report()`

```sql
-- CRON: Todo domingo 12:00 UTC (09:00 BRT)
-- Destinatarios: valdair3d@gmail.com, steven@stevenjwilson.com

-- Metricas atuais:
v_unique_visitors   -- analytics.project_id=117
v_total_sessions    -- analytics.project_id=117
v_total_pageviews   -- analytics.project_id=117
v_total_waitlist    -- tabela waitlist
v_new_waitlist_count -- waitlist criados nos ultimos 7 dias

-- Templates:
-- weekly_report_no_waitlist (sem novos signups)
-- weekly_report_with_waitlist (com novos signups - celebracao)
```

### Dados Atuais (Ultimos 7 Dias)

| Metrica | Valor | Fonte |
|---------|-------|-------|
| Visitantes Unicos | 15 | analytics (project_id=117) |
| Sessoes | 125 | analytics (project_id=117) |
| Pageviews | 238 | analytics (project_id=117) |
| Total Waitlist | 5 | waitlist |
| Novos na Waitlist | 1 | waitlist (7 dias) |

---

## 3. Dados NOVOS a Adicionar: Simulacoes

### Tabela: `url_analyzer_rate_limit`

```sql
-- Estrutura:
id BIGINT
ip_address INET
request_timestamp TIMESTAMPTZ
created_at TIMESTAMPTZ
url_analyzed TEXT  -- URL que o usuario testou na landing page
```

### Dados de Simulacoes

| Periodo | Total |
|---------|-------|
| Todos os tempos | 44 |
| Ultimos 30 dias | 3 |
| Ultimos 7 dias | 2 |

### Como Integrar ao Report

```sql
-- Adicionar a send_weekly_owner_report():
DECLARE
  v_simulations_week INTEGER;
  v_simulations_total INTEGER;

-- Buscar simulacoes
SELECT
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
  COUNT(*)
INTO v_simulations_week, v_simulations_total
FROM url_analyzer_rate_limit;

-- Adicionar as variaveis do template
v_variables := v_variables || jsonb_build_object(
  'simulations_week', v_simulations_week::TEXT,
  'simulations_total', v_simulations_total::TEXT
);
```

---

## 4. Sistema de Subscriptions

### Estrutura Atual

```
customers (26 registros com user_id)
    │
    └── subscriptions (3 registros)
            ├── active: 2 (Growth plan)
            └── payment_failed: 1 (Growth plan)
```

### Assinantes Ativos

| Customer | Email | Plano | Status | Proxima Cobranca |
|----------|-------|-------|--------|------------------|
| valdair3d | valdair3d@hotmail.com | Growth | active | 2026-01-03 |
| BVS Tecnologia | valdair3d@gmail.com | Growth | active | 2026-01-20 |

### Problema: Sem Analytics por Projeto

```sql
-- Apenas project_id=117 existe na tabela analytics
-- Isso significa: clientes ainda NAO tem tracking em seus sites

SELECT DISTINCT project_id FROM analytics;
-- Resultado: apenas 117 (liftlio.com)
```

---

## 5. Proposta: Dois Tipos de Report

### 5.1 Report do Sistema Liftlio (Owners)

**Destinatarios**: valdair3d@gmail.com, steven@stevenjwilson.com
**Frequencia**: Domingo 09:00 BRT
**Status**: JA EXISTE - apenas adicionar simulacoes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LIFTLIO WEEKLY REPORT - 23 Dec - 30 Dec 2025                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SITE ANALYTICS (liftlio.com)                                              │
│  ┌─────────────┬─────────────┬─────────────┐                               │
│  │   VISITORS  │  SESSIONS   │  PAGEVIEWS  │                               │
│  │     15      │    125      │    238      │                               │
│  └─────────────┴─────────────┴─────────────┘                               │
│                                                                             │
│  WAITLIST                                                                   │
│  ┌─────────────┬─────────────┐                                             │
│  │    TOTAL    │  NEW THIS   │                                             │
│  │      5      │   WEEK: 1   │                                             │
│  └─────────────┴─────────────┘                                             │
│                                                                             │
│  LANDING PAGE SIMULATIONS  ← NOVO!                                         │
│  ┌─────────────┬─────────────┐                                             │
│  │  THIS WEEK  │    TOTAL    │                                             │
│  │      2      │     44      │                                             │
│  └─────────────┴─────────────┘                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Report por Projeto (Assinantes)

**Destinatarios**: Email do customer com subscription.status = 'active'
**Frequencia**: Domingo 09:00 BRT
**Status**: A IMPLEMENTAR (quando houver dados)

**Pre-requisito**: Clientes precisam instalar tracking nos seus sites:
```html
<script async src="https://track.liftlio.com/t.js" data-id="SEU_PROJECT_ID"></script>
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  YOUR PROJECT WEEKLY REPORT - 23 Dec - 30 Dec 2025                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Project: [Nome do Projeto]                                                │
│                                                                             │
│  ANALYTICS                                                                  │
│  ┌─────────────┬─────────────┬─────────────┐                               │
│  │   VISITORS  │  SESSIONS   │  PAGEVIEWS  │                               │
│  │     XXX     │    XXX      │    XXX      │                               │
│  └─────────────┴─────────────┴─────────────┘                               │
│                                                                             │
│  TOP PAGES                                                                  │
│  1. /home - XXX views                                                      │
│  2. /pricing - XXX views                                                   │
│  3. /about - XXX views                                                     │
│                                                                             │
│  TRAFFIC SOURCES                                                            │
│  - Organic: XX%                                                            │
│  - Direct: XX%                                                             │
│  - Social: XX%                                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementacao Proposta

### Fase 1: Adicionar Simulacoes ao Report Atual

**Mudancas necessarias:**

1. **Atualizar `send_weekly_owner_report()`**
   - Adicionar query para url_analyzer_rate_limit
   - Adicionar variaveis ao template

2. **Atualizar templates de email**
   - weekly_report_no_waitlist
   - weekly_report_with_waitlist
   - Adicionar secao "Landing Page Simulations"

### Fase 2: Reports por Projeto (Futuro)

**Pre-requisitos:**
1. Clientes precisam ter project_id na tabela analytics
2. Relacionamento customer → project_id precisa existir
3. Nova funcao: `send_weekly_project_report(customer_id)`
4. Novo CRON job para iterar sobre assinantes ativos

---

## 7. Esclarecimento: admin_analytics vs analytics

| Aspecto | analytics | admin_analytics |
|---------|-----------|-----------------|
| **Proposito** | Visitantes do SITE publico | Usuarios LOGADOS no app |
| **Fonte** | track.liftlio.com (VPS) | React hook direto |
| **Quem ve** | Qualquer visitante | So usuarios autenticados |
| **Weekly Report** | SIM (correto!) | NAO (seria errado) |
| **Admin Dashboard** | NAO | SIM (Live Analytics) |

**IMPORTANTE**: O weekly report do owner DEVE continuar usando `analytics`
porque mostra quantas pessoas visitaram liftlio.com (marketing).
O `admin_analytics` mostra apenas usuarios logados navegando no dashboard.

---

## 8. Resumo de Acoes

| Prioridade | Acao | Complexidade |
|------------|------|--------------|
| 1 | Adicionar simulacoes ao weekly report | Baixa |
| 2 | Atualizar templates de email | Baixa |
| 3 | Criar funcao send_weekly_project_report() | Media |
| 4 | CRON para reports de assinantes | Media |

---

## 9. SQL Proposto para Fase 1

```sql
-- Adicionar a send_weekly_owner_report()
-- Apos buscar waitlist, adicionar:

-- =============================================
-- 3. BUSCAR SIMULACOES DA LANDING PAGE
-- =============================================
SELECT
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
  COUNT(*)
INTO v_simulations_week, v_simulations_total
FROM url_analyzer_rate_limit;

-- Adicionar ao v_variables:
v_variables := jsonb_build_object(
  'week_range', v_week_range,
  'unique_visitors', v_unique_visitors::TEXT,
  'total_sessions', v_total_sessions::TEXT,
  'total_pageviews', v_total_pageviews::TEXT,
  'total_waitlist', v_total_waitlist::TEXT,
  'new_waitlist_count', v_new_waitlist_count::TEXT,
  'simulations_week', v_simulations_week::TEXT,      -- NOVO
  'simulations_total', v_simulations_total::TEXT     -- NOVO
);
```

---

*Analise criada em 2025-12-30*
*Status: Pronto para implementar Fase 1*
