# 🚀 PIPELINE DE PROCESSAMENTO LIFTLIO

## 📊 Visão Geral

Este pipeline automatiza o processamento completo de projetos no Liftlio, desde a inicialização até o engajamento final.

## 🔄 Fluxo de Status

```
[0] Inicialização → [1] Scanner → [2] Stats → [3] Análise Vídeo → [4] Análise Comentário → [5] Engajamento → [6] Concluído
```

## 🎯 Função Orquestradora

### `schedule_process_project` (TRIGGER)
- **Localização**: `00_TRIGGER_PRINCIPAL/`
- **Descrição**: Trigger disparada quando o status do projeto muda
- **Ação**: Agenda job apropriado baseado no status atual

## 📁 Estrutura de Pastas

### STATUS_0_INICIALIZACAO
- **Função Principal**: `atualizar_scanner_rodada`
- **Ação**: Define rodada=1 para scanners ativos
- **Próximo Status**: 1

### STATUS_1_SCANNER_PROCESSING
- **Função Principal**: `process_next_project_scanner`
- **Dependências**: `update_video_id_cache`
- **Ação**: Busca IDs de vídeos do YouTube
- **Próximo Status**: 2

### STATUS_2_VIDEO_STATS
- **Função Principal**: `update_video_stats`
- **Dependências**: `get_youtube_video_stats`, `start_video_processing`
- **Ação**: Coleta estatísticas dos vídeos
- **Próximo Status**: 3

### STATUS_3_VIDEO_ANALYSIS
- **Função Principal**: `start_video_analysis_processing`
- **Dependências**: `process_video_analysis_batch`, `update_video_analysis`
- **Ação**: Analisa vídeos com Claude AI
- **Próximo Status**: 4

### STATUS_4_COMMENT_ANALYSIS
- **Função Principal**: `start_comment_analysis_processing`
- **Dependências**: `process_comment_analysis_batch`, `atualizar_comentarios_analisados`, `analisar_comentarios_com_claude`
- **Ação**: Analisa comentários para identificar leads
- **Próximo Status**: 5

### STATUS_5_ENGAGEMENT
- **Função Principal**: `start_engagement_messages_processing`
- **Ação**: Gera mensagens de engajamento
- **Próximo Status**: 6

## 🛠️ Comandos Úteis

### Verificar Status de um Projeto
```sql
SELECT status FROM "Projeto" WHERE id = ?;
```

### Forçar Mudança de Status
```sql
UPDATE "Projeto" SET status = '?' WHERE id = ?;
```

### Ver Jobs Agendados
```sql
SELECT * FROM cron.job WHERE jobname LIKE '%project_%';
```

### Remover Job Travado
```sql
SELECT cron.unschedule('process_project_status_?');
```

## ⚠️ Proteções Implementadas

1. **Circuit Breaker**: Máximo 100 execuções por hora
2. **Advisory Locks**: Previne execuções paralelas
3. **Auto-validação**: Comandos verificam se ainda precisam executar
4. **Backoff**: Intervalo aumenta com muitas execuções

## 🐛 Troubleshooting

### Projeto Travado em um Status
1. Verificar logs: `SELECT * FROM system_logs WHERE operation LIKE '%project_id%'`
2. Verificar jobs: `SELECT * FROM cron.job_run_details WHERE jobname LIKE '%project_id%'`
3. Forçar próximo status manualmente

### Loop Infinito
1. Circuit breaker deve parar após 100 execuções
2. Se necessário: `SELECT cron.unschedule('job_name')`

### Funções Faltando
1. Verificar no banco: `SELECT proname FROM pg_proc WHERE proname = 'function_name'`
2. Restaurar do backup se necessário

## 📈 Métricas

- **Tempo médio por status**: ~5-30 minutos dependendo do volume
- **Taxa de sucesso**: 95%+ quando integração válida
- **Principais falhas**: Timeout de API, limite de rate

## 🔗 Dependências Externas

- YouTube Data API
- Claude AI API
- Edge Functions do Supabase
- pg_cron para agendamento