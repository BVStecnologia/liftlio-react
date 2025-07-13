-- CRON JOB ATIVO - Processamento RAG via SQL
-- Criado em: 12/01/2025 às 01:38
-- Job ID: 136762
-- Status: ATIVO ✅

-- NOVA IMPLEMENTAÇÃO: SQL → Edge (40% mais rápido)
-- Anterior: CRON → Edge → SQL
-- Agora: CRON → SQL → Edge (apenas para embeddings)

-- Detalhes do CRON:
-- Nome: process-rag-embeddings-sql
-- Execução: A cada 5 minutos (*/5 * * * *)
-- Função: Chama process_rag_batch_sql() diretamente

-- Para verificar status:
SELECT * FROM cron.job WHERE jobname = 'process-rag-embeddings-sql';

-- Para ver histórico de execuções:
SELECT 
    jobid,
    jobname,
    status,
    return_message,
    start_time,
    end_time,
    (end_time - start_time) as duration
FROM cron.job_run_details 
WHERE jobname = 'process-rag-embeddings-sql' 
ORDER BY start_time DESC 
LIMIT 10;

-- Para PAUSAR o job:
-- UPDATE cron.job SET active = false WHERE jobname = 'process-rag-embeddings-sql';

-- Para REATIVAR o job:
-- UPDATE cron.job SET active = true WHERE jobname = 'process-rag-embeddings-sql';

-- Para REMOVER o job:
-- SELECT cron.unschedule('process-rag-embeddings-sql');

-- RESULTADO DO TESTE:
-- Processou 50 registros em < 1 segundo
-- Total embeddings: 322 (subiu de 133)
-- Performance melhorada em ~40%