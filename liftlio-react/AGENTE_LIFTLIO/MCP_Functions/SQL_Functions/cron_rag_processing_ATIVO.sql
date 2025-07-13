-- CRON JOB ATIVO - Processamento RAG
-- Criado em: 11/01/2025 às 19:52
-- Job ID: 136761
-- Status: ATIVO ✅

-- Detalhes do CRON:
-- Nome: process-rag-embeddings
-- Execução: A cada 5 minutos (*/5 * * * *)
-- Função: Chama a Edge Function process-rag-batch

-- Para verificar status:
SELECT * FROM cron.job WHERE jobname = 'process-rag-embeddings';

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
WHERE jobname = 'process-rag-embeddings' 
ORDER BY start_time DESC 
LIMIT 10;

-- Para PAUSAR o job:
-- UPDATE cron.job SET active = false WHERE jobname = 'process-rag-embeddings';

-- Para REATIVAR o job:
-- UPDATE cron.job SET active = true WHERE jobname = 'process-rag-embeddings';

-- Para REMOVER o job:
-- SELECT cron.unschedule('process-rag-embeddings');