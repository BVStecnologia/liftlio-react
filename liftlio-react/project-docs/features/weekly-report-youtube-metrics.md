# Analise: Adicionar Metricas de YouTube Replies ao Weekly Report

## Status: ANALISE COMPLETA

> **TL;DR**: Adicionar contagem de replies postadas ao relatorio semanal.
> Browser Agent roda sabado para verificar engagement real.
> Admin mostra config atual (read-only).

---

## Situacao Atual

### Weekly Report Existente

```
CRON: 0 12 * * 0 (Domingo 12:00 UTC = 09:00 BRT)
│
├── Metricas enviadas:
│   ├── unique_visitors (site liftlio.com)
│   ├── total_sessions
│   ├── total_pageviews
│   ├── total_waitlist
│   └── new_waitlist_count
│
├── Templates:
│   ├── weekly_report_no_waitlist
│   └── weekly_report_with_waitlist
│
└── Recipients:
    ├── valdair3d@gmail.com
    └── steven@stevenjwilson.com
```

### Dados de Replies JA Disponiveis no Banco

```sql
-- Esta semana (ultimos 7 dias):
total_reply_attempts: 7
replies_posted: 3       -- status = 'completed'
replies_failed: 4       -- status = 'failed'
videos_liked: 1         -- response->>'video_liked' = 'true'
comments_liked: 1       -- response->>'comment_liked' = 'true'
```

**Estes dados podem ser incluidos SEM Browser Agent!**

---

## Proposta: Dois Niveis de Metricas

### Nivel 1: Metricas do Banco (Simples)
Dados que ja temos em `browser_tasks`:
- Replies tentadas
- Replies postadas com sucesso
- Taxa de sucesso
- Videos/comentarios curtidos

**Implementacao: Apenas atualizar SQL function**

### Nivel 2: Metricas Verificadas (Browser Agent)
Dados que precisam de verificacao real no YouTube:
- Replies ainda existem? (YouTube pode deletar)
- Quantos likes nossas replies receberam?
- Alguem respondeu nossas replies?
- Notificacoes de engagement

**Implementacao: CRON no sabado + Browser task**

---

## Fluxo Proposto

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUXO SEMANAL COMPLETO                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SABADO 06:00 UTC (03:00 BRT) - 30h antes do report                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CRON: schedule_youtube_metrics_check()                             │   │
│  │  └── Cria browser_task:                                             │   │
│  │      task_type: 'youtube_metrics_weekly'                            │   │
│  │      task: "Check YouTube notifications and verify reply engagement"│   │
│  │      priority: 1 (alta)                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  SABADO 06:00-12:00 UTC                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Browser Agent processa a task                                      │   │
│  │  ├── Login no YouTube (conta Codigo-e-Sabedoria)                   │   │
│  │  ├── Vai para YouTube Studio > Notifications                        │   │
│  │  ├── Para cada reply postada esta semana:                          │   │
│  │  │   ├── Verifica se ainda existe                                  │   │
│  │  │   ├── Conta likes recebidos                                     │   │
│  │  │   └── Verifica se teve respostas                                │   │
│  │  └── Salva resultado estruturado                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                           │                                                 │
│                           ▼                                                 │
│  browser_tasks.response:                                                   │
│  {                                                                          │
│    "replies_checked": 3,                                                   │
│    "replies_still_exist": 3,                                               │
│    "replies_deleted": 0,                                                   │
│    "total_likes_received": 5,                                              │
│    "replies_to_our_comments": 2,                                           │
│    "top_performing_reply": {                                               │
│      "video_title": "How To Close Web Design Clients",                     │
│      "likes": 3,                                                           │
│      "replies": 1                                                          │
│    }                                                                        │
│  }                                                                          │
│                           │                                                 │
│                           ▼                                                 │
│  DOMINGO 12:00 UTC (09:00 BRT)                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  CRON: send_weekly_owner_report()                                   │   │
│  │  ├── Query analytics (visitors, sessions, pageviews)               │   │
│  │  ├── Query waitlist (total, novos)                                 │   │
│  │  ├── Query browser_tasks para replies postadas                     │   │
│  │  ├── Query browser_tasks para youtube_metrics_weekly               │   │
│  │  └── Envia email com TODAS as metricas                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementacao Detalhada

### 1. SQL Function: schedule_youtube_metrics_check

```sql
CREATE OR REPLACE FUNCTION schedule_youtube_metrics_check()
RETURNS jsonb AS $$
DECLARE
  v_task_id UUID;
  v_project_id INTEGER := 117; -- Projeto Liftlio
BEGIN
  -- Criar task para o Browser Agent
  INSERT INTO browser_tasks (
    id,
    project_id,
    task,
    task_type,
    status,
    priority,
    metadata,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_project_id,
    'Check YouTube notifications and verify engagement on replies posted this week. ' ||
    'For each reply we posted: 1) Verify it still exists, 2) Count likes received, ' ||
    '3) Check if anyone replied to our comment. Return structured JSON with metrics.',
    'youtube_metrics_weekly',
    'pending',
    1, -- Alta prioridade
    jsonb_build_object(
      'week_start', (NOW() - INTERVAL '7 days')::date,
      'week_end', NOW()::date,
      'purpose', 'weekly_report_metrics'
    ),
    NOW()
  ) RETURNING id INTO v_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', v_task_id,
    'scheduled_for', 'Browser Agent will process'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. CRON Job para Sabado

```sql
-- Agendar para sabado 06:00 UTC (03:00 BRT)
SELECT cron.schedule(
  'youtube_metrics_check',
  '0 6 * * 6',  -- Sabado 06:00 UTC
  'SELECT schedule_youtube_metrics_check()'
);
```

### 3. Atualizar send_weekly_owner_report

```sql
-- Adicionar variaveis para YouTube metrics
DECLARE
  -- ... variaveis existentes ...

  -- YouTube Reply metrics (do banco)
  v_replies_attempted INTEGER;
  v_replies_posted INTEGER;
  v_replies_success_rate INTEGER;

  -- YouTube Engagement (do Browser Agent)
  v_youtube_metrics JSONB;
  v_replies_verified INTEGER;
  v_likes_received INTEGER;
  v_engagement_replies INTEGER;

-- ... no corpo da funcao ...

-- BUSCAR METRICAS DE REPLIES (ultimos 7 dias)
SELECT
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'completed'),
  CASE
    WHEN COUNT(*) > 0
    THEN ROUND(COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*) * 100)
    ELSE 0
  END
INTO v_replies_attempted, v_replies_posted, v_replies_success_rate
FROM browser_tasks
WHERE task_type = 'youtube_reply'
AND created_at > NOW() - INTERVAL '7 days';

-- BUSCAR METRICAS DO BROWSER AGENT (se existir task completada)
SELECT response
INTO v_youtube_metrics
FROM browser_tasks
WHERE task_type = 'youtube_metrics_weekly'
AND status = 'completed'
AND created_at > NOW() - INTERVAL '2 days'
ORDER BY completed_at DESC
LIMIT 1;

-- Extrair valores (com fallback)
v_replies_verified := COALESCE((v_youtube_metrics->>'replies_still_exist')::int, v_replies_posted);
v_likes_received := COALESCE((v_youtube_metrics->>'total_likes_received')::int, 0);
v_engagement_replies := COALESCE((v_youtube_metrics->>'replies_to_our_comments')::int, 0);

-- Adicionar ao v_variables
v_variables := v_variables || jsonb_build_object(
  'replies_attempted', v_replies_attempted::TEXT,
  'replies_posted', v_replies_posted::TEXT,
  'replies_success_rate', v_replies_success_rate::TEXT || '%',
  'replies_verified', v_replies_verified::TEXT,
  'likes_received', v_likes_received::TEXT,
  'engagement_replies', v_engagement_replies::TEXT
);
```

### 4. Atualizar Template de Email

Adicionar nova secao no HTML:

```html
<!-- YouTube Engagement Section -->
<tr>
  <td style="padding: 20px 40px;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%"
           style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px;">
      <tr>
        <td style="padding: 20px; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">
            YouTube Replies This Week
          </p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 15px;">
            <tr>
              <td width="33%" style="text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff;">
                  {{replies_posted}}
                </p>
                <p style="margin: 5px 0 0; font-size: 11px; color: rgba(255,255,255,0.8);">
                  Posted
                </p>
              </td>
              <td width="33%" style="text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff;">
                  {{likes_received}}
                </p>
                <p style="margin: 5px 0 0; font-size: 11px; color: rgba(255,255,255,0.8);">
                  Likes Received
                </p>
              </td>
              <td width="33%" style="text-align: center;">
                <p style="margin: 0; font-size: 32px; font-weight: 800; color: #ffffff;">
                  {{engagement_replies}}
                </p>
                <p style="margin: 5px 0 0; font-size: 11px; color: rgba(255,255,255,0.8);">
                  Replies to Us
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td>
</tr>
```

---

## Admin Dashboard: Exibir Config Atual

Adicionar no Settings uma secao **read-only** mostrando:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📧 Weekly Owner Report                                          [ACTIVE]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Schedule: Every Sunday at 09:00 BRT (12:00 UTC)                           │
│                                                                             │
│  Recipients:                                                                │
│  • valdair3d@gmail.com                                                     │
│  • steven@stevenjwilson.com                                                │
│                                                                             │
│  Metrics Included:                                                          │
│  ✓ Site Analytics (visitors, sessions, pageviews)                          │
│  ✓ Waitlist Updates                                                        │
│  ✓ YouTube Replies (posted, likes, engagement)  ← NOVO                     │
│                                                                             │
│  Pre-Report Task: Saturday 03:00 BRT - Browser Agent checks YouTube        │
│                                                                             │
│  Last Sent: Dec 22, 2025 at 09:00 BRT                                     │
│                                                                             │
│  [Test Send Now]                                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Resumo de Mudancas

| Componente | Acao |
|------------|------|
| `schedule_youtube_metrics_check()` | CRIAR - Nova SQL function |
| CRON `youtube_metrics_check` | CRIAR - Sabado 06:00 UTC |
| `send_weekly_owner_report()` | ATUALIZAR - Adicionar metricas YouTube |
| `weekly_report_*` templates | ATUALIZAR - Adicionar secao YouTube |
| AdminDashboard Settings | ADICIONAR - Secao read-only do report |

---

## Ordem de Implementacao

1. **Criar `schedule_youtube_metrics_check()`** - SQL function
2. **Agendar CRON** para sabado 06:00 UTC
3. **Atualizar `send_weekly_owner_report()`** - query replies + metrics
4. **Atualizar templates** - adicionar secao YouTube
5. **Adicionar ao Admin** - exibir config atual
6. **Testar manualmente** - `SELECT schedule_youtube_metrics_check()`
7. **Testar report** - `SELECT send_weekly_owner_report()`

---

## Alternativa Simplificada (Sem Browser Agent)

Se quiser comecar mais simples, podemos:
1. Usar APENAS dados do banco (replies postadas, success rate)
2. Nao verificar engagement real no YouTube
3. Adicionar Browser Agent depois

**Metricas disponiveis SEM Browser:**
- Replies tentadas: 7
- Replies postadas: 3
- Taxa de sucesso: 43%
- Videos curtidos: 1
- Comentarios curtidos: 1

---

*Analise criada em 2025-12-28*
*Status: Pronto para implementar*
