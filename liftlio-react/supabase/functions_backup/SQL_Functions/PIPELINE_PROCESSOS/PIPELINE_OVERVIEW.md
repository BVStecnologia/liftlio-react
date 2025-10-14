# 📊 LIFTLIO PIPELINE - VISÃO GERAL COMPLETA

**Última atualização**: 2025-01-30
**Total de Funções**: 27 SQL Functions + 5 Edge Functions

---

## 🎯 FLUXO GERAL DO PIPELINE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TRIGGER PRINCIPAL                                   │
│                    schedule_process_project()                                │
│           Detecta mudanças de status e inicia processos                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  STATUS 0 → 1: INICIALIZAÇÃO                                      │
    │  • atualizar_scanner_rodada()                                     │
    │  ⏱️  Tempo: Instantâneo                                            │
    │  🎯 Objetivo: Preparar scanners para rodada                        │
    └───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  STATUS 1 → 2: PROCESSAMENTO DE SCANNERS                         │
    │  • process_next_project_scanner() [main]                          │
    │    └─> update_video_id_cache() [helper]                           │
    │    └─> get_youtube_channel_videos() [Edge Function]               │
    │  ⏱️  Tempo: 30s entre scanners                                     │
    │  🎯 Objetivo: Buscar vídeos novos do YouTube                       │
    │  🔒 Proteção: Advisory locks                                       │
    └───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  STATUS 2 → 3: ESTATÍSTICAS E COMENTÁRIOS DOS VÍDEOS             │
    │  • update_video_stats() [main - 7s entre batches]                 │
    │    └─> call_youtube_edge_function() [helper]                      │
    │    └─> get_youtube_video_stats() [Edge Function]                  │
    │                                                                    │
    │  • start_video_processing() [main - trigger ao fim de stats]      │
    │    └─> process_videos_batch() [main - 5s entre batches]           │
    │       └─> process_pending_videos() [helper]                       │
    │          └─> fetch_and_store_comments_for_video() [core]          │
    │             └─> get_youtube_video_comments() [Edge Function]      │
    │  ⏱️  Tempo: 7s (stats) + 5s (comentários) por batch               │
    │  🎯 Objetivo: Coletar dados completos dos vídeos                   │
    │  🔒 Proteção: Circuit breaker (max 100 exec/hora)                 │
    │  ⚠️  BUG: process_videos_batch linha 58 deve setar status='3'     │
    └───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  STATUS 3 → 4: ANÁLISE DE VÍDEOS COM CLAUDE AI                   │
    │  • start_video_analysis_processing() [main]                        │
    │    └─> process_video_analysis_batch() [main - 30s entre batches]  │
    │       └─> update_video_analysis() [helper]                        │
    │          └─> analyze_video_with_claude() [Edge Function]          │
    │             └─> claude_complete() [API wrapper]                   │
    │  ⏱️  Tempo: 30s por batch de 5 vídeos                             │
    │  🎯 Objetivo: Análise AI de relevância e tópicos                   │
    │  🔒 Proteção: Advisory locks + circuit breaker                    │
    └───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  STATUS 4 → 5: ANÁLISE DE COMENTÁRIOS (LEAD SCORING)             │
    │  • start_comment_analysis_processing() [main]                      │
    │    └─> process_comment_analysis_batch() [main - 15s entre batches]│
    │       └─> atualizar_comentarios_analisados() [helper]             │
    │          └─> analisar_comentarios_com_claude() [Edge Function]    │
    │             └─> claude_complete() [API wrapper]                   │
    │  ⏱️  Tempo: 15s por batch de 10 comentários                       │
    │  🎯 Objetivo: Score PICS para identificar leads                    │
    │  🔒 Proteção: Advisory locks + circuit breaker                    │
    └───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
    ┌───────────────────────────────────────────────────────────────────┐
    │  STATUS 5 → 6: MENSAGENS DE ENGAJAMENTO                          │
    │  • start_engagement_messages_processing() [main]                   │
    │    └─> process_engagement_messages_batch() [main - 30s batches]   │
    │       └─> process_and_create_messages_engagement() [core]         │
    │          └─> process_engagement_comments_with_claude() [Edge Fn]  │
    │       └─> agendar_postagens_todos_projetos() [scheduler]          │
    │  ⏱️  Tempo: 30s por batch de 5 comentários                        │
    │  🎯 Objetivo: Criar mensagens personalizadas para leads            │
    │  🔒 Proteção: Advisory locks + circuit breaker                    │
    └───────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ✅ PIPELINE COMPLETO
                        Status 6 = Finalizado
```

---

## 📋 ÍNDICE DE FUNÇÕES POR STATUS

### STATUS 0 → 1: Inicialização
| Função | Tipo | Descrição |
|--------|------|-----------|
| `atualizar_scanner_rodada()` | Main | Seta rodada=1 em scanners ativos |

### STATUS 1 → 2: Scanner Processing
| Função | Tipo | Descrição |
|--------|------|-----------|
| `process_next_project_scanner()` | Main | Processa um scanner por vez |
| `update_video_id_cache()` | Helper | Atualiza cache de IDs |
| `get_youtube_channel_videos()` | Edge Fn | Busca vídeos da API YouTube |

### STATUS 2 → 3: Video Stats & Comments
| Função | Tipo | Descrição |
|--------|------|-----------|
| `update_video_stats()` | Main | Atualiza estatísticas dos vídeos |
| `call_youtube_edge_function()` | Helper | Wrapper para Edge Function |
| `get_youtube_video_stats()` | Edge Fn | Busca stats da API YouTube |
| `start_video_processing()` | Main | Inicia processamento de comentários |
| `process_videos_batch()` | Main | Processa vídeos em lotes |
| `process_pending_videos()` | Helper | Itera sobre vídeos pendentes |
| `fetch_and_store_comments_for_video()` | Core | Busca e salva comentários |
| `get_youtube_video_comments()` | Edge Fn | Busca comentários da API YouTube |

### STATUS 3 → 4: Video Analysis
| Função | Tipo | Descrição |
|--------|------|-----------|
| `start_video_analysis_processing()` | Main | Inicia análise de vídeos |
| `process_video_analysis_batch()` | Main | Processa vídeos em lotes |
| `update_video_analysis()` | Helper | Atualiza campos de análise |
| `analyze_video_with_claude()` | Edge Fn | Análise AI com Claude |
| `claude_complete()` | API | Wrapper para Claude API |

### STATUS 4 → 5: Comment Analysis
| Função | Tipo | Descrição |
|--------|------|-----------|
| `start_comment_analysis_processing()` | Main | Inicia análise de comentários |
| `process_comment_analysis_batch()` | Main | Processa comentários em lotes |
| `atualizar_comentarios_analisados()` | Helper | Atualiza status de análise |
| `analisar_comentarios_com_claude()` | Edge Fn | Score PICS com Claude |
| `claude_complete()` | API | Wrapper para Claude API |

### STATUS 5 → 6: Engagement Messages
| Função | Tipo | Descrição |
|--------|------|-----------|
| `start_engagement_messages_processing()` | Main | Inicia criação de mensagens |
| `process_engagement_messages_batch()` | Main | Processa mensagens em lotes |
| `process_and_create_messages_engagement()` | Core | Cria mensagens personalizadas |
| `process_engagement_comments_with_claude()` | Edge Fn | Gera mensagens com Claude |
| `agendar_postagens_todos_projetos()` | Scheduler | Agenda postagens futuras |

---

## 🛡️ MECANISMOS DE PROTEÇÃO

### Advisory Locks
- **Função**: `pg_try_advisory_lock()`
- **Objetivo**: Prevenir execução simultânea
- **Usado em**: STATUS 1, 3, 4, 5

### Circuit Breaker
- **Lógica**: Máximo 100 execuções por hora
- **Usado em**: STATUS 2, 3, 4, 5
- **Proteção**: Evita sobrecarga da API

### Backoff Exponencial
- **Intervalos**: 7s → 15s → 30s
- **Usado em**: STATUS 2, 3, 4, 5
- **Objetivo**: Rate limiting progressivo

---

## 🔧 TECNOLOGIAS UTILIZADAS

- **PostgreSQL**: Functions em PL/pgSQL
- **pg_cron**: Agendamento de jobs
- **Supabase Edge Functions**: Deno runtime
- **YouTube Data API v3**: Dados de vídeos/comentários
- **Claude API (Anthropic)**: Análise AI e lead scoring
- **Advisory Locks**: Controle de concorrência

---

## 📊 MÉTRICAS TÍPICAS

| Status | Tempo Médio | Batch Size | Intervalo |
|--------|-------------|------------|-----------|
| 0 → 1  | < 1s        | N/A        | Instantâneo |
| 1 → 2  | 5-15 min    | 1 scanner  | 30s |
| 2 → 3  | 30-120 min  | 10 vídeos  | 7s (stats) + 5s (comments) |
| 3 → 4  | 60-180 min  | 5 vídeos   | 30s |
| 4 → 5  | 120-300 min | 10 comments| 15s |
| 5 → 6  | 30-90 min   | 5 comments | 30s |

---

## ⚠️ BUGS CONHECIDOS

### 🐛 BUG CRÍTICO: process_videos_batch linha 58
**Arquivo**: `/STATUS_2_VIDEO_STATS/process_videos_batch.sql`
**Linha**: 58
**Problema**: Status sendo revertido de '3' para '2'

```sql
-- ❌ ATUAL (ERRADO):
UPDATE public."Projeto"
SET status = '2'
WHERE id = project_id;

-- ✅ CORREÇÃO:
UPDATE public."Projeto"
SET status = '3'
WHERE id = project_id;
```

**Impacto**: Cria loop STATUS 2 ↔ 3
**Causa**: `update_video_stats()` muda para '3', depois `start_video_processing()` chama `process_videos_batch()` que reverte para '2'
**Solução**: Ver `BUG_FIXES.md`

---

## 🔍 TROUBLESHOOTING RÁPIDO

### Pipeline travado no STATUS 1
- Verificar: `process_next_project_scanner()`
- Checar: Advisory locks não liberados
- Log: `pg_stat_activity` com locks ativos

### Pipeline travado no STATUS 2
- Verificar: `process_videos_batch()` e BUG linha 58
- Checar: Circuit breaker atingido
- Log: `get_youtube_video_stats()` com erros

### Pipeline travado no STATUS 3
- Verificar: `process_video_analysis_batch()`
- Checar: Claude API rate limit
- Log: `analyze_video_with_claude()` com timeouts

### Pipeline travado no STATUS 4
- Verificar: `process_comment_analysis_batch()`
- Checar: Comentários sem análise PICS
- Log: `analisar_comentarios_com_claude()` com erros

### Pipeline travado no STATUS 5
- Verificar: `process_engagement_messages_batch()`
- Checar: Mensagens não sendo criadas
- Log: `process_engagement_comments_with_claude()` com falhas

---

## 📁 ESTRUTURA DE ARQUIVOS

```
PIPELINE_PROCESSOS/
├── PIPELINE_OVERVIEW.md                    (este arquivo)
├── BUG_FIXES.md                            (correções documentadas)
├── 00_TRIGGER_PRINCIPAL/
│   ├── README.md                           (documentação do trigger)
│   └── schedule_process_project.sql
├── STATUS_0_INICIALIZACAO/
│   ├── README.md                           (mapa mental STATUS 0→1)
│   └── atualizar_scanner_rodada.sql
├── STATUS_1_SCANNER_PROCESSING/
│   ├── README.md                           (mapa mental STATUS 1→2)
│   ├── process_next_project_scanner.sql
│   └── update_video_id_cache.sql
├── STATUS_2_VIDEO_STATS/
│   ├── README.md                           (mapa mental STATUS 2→3)
│   ├── update_video_stats.sql
│   ├── call_youtube_edge_function.sql
│   ├── start_video_processing.sql
│   ├── process_videos_batch.sql            ⚠️  BUG linha 58
│   ├── process_pending_videos.sql
│   └── fetch_and_store_comments_for_video.sql
├── STATUS_3_VIDEO_ANALYSIS/
│   ├── README.md                           (mapa mental STATUS 3→4)
│   ├── start_video_analysis_processing.sql
│   ├── process_video_analysis_batch.sql
│   └── update_video_analysis.sql
├── STATUS_4_COMMENT_ANALYSIS/
│   ├── README.md                           (mapa mental STATUS 4→5)
│   ├── start_comment_analysis_processing.sql
│   ├── process_comment_analysis_batch.sql
│   └── atualizar_comentarios_analisados.sql
└── STATUS_5_ENGAGEMENT_MESSAGES/
    ├── README.md                           (mapa mental STATUS 5→6)
    ├── start_engagement_messages_processing.sql
    ├── process_engagement_messages_batch.sql
    ├── process_and_create_messages_engagement.sql
    └── agendar_postagens_todos_projetos.sql
```

---

## 🚀 COMO USAR ESTA DOCUMENTAÇÃO

1. **Para entender o fluxo completo**: Leia este arquivo (PIPELINE_OVERVIEW.md)
2. **Para debugar um status específico**: Vá para `/STATUS_X_*/README.md`
3. **Para corrigir bugs**: Consulte `BUG_FIXES.md`
4. **Para monitorar o pipeline**: Use as queries em cada README de STATUS

---

**Criado por**: Claude Code (Anthropic)
**Data**: 2025-01-30
**Versão**: 1.0