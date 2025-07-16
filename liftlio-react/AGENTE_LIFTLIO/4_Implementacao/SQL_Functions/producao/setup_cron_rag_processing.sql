-- Configurar CRON para processamento automático do RAG
-- Criado em: 11/01/2025
-- Descrição: Configura execução automática a cada 5 minutos

-- IMPORTANTE: Executar no Supabase Dashboard > SQL Editor

-- 1. Primeiro, verificar se a extensão pg_cron está habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Verificar se a extensão pg_net está habilitada (necessária para chamadas HTTP)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Criar o job de processamento RAG
-- Este job será executado a cada 5 minutos
SELECT cron.schedule(
    'process-rag-embeddings', -- nome do job
    '*/5 * * * *', -- a cada 5 minutos
    $$
    SELECT net.http_post(
        url := 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/process-rag-batch',
        headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
            'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
    );
    $$
);

-- 4. Verificar jobs ativos
SELECT * FROM cron.job;

-- 5. Para DESATIVAR o job (quando necessário):
-- SELECT cron.unschedule('process-rag-embeddings');

-- 6. Para ver histórico de execuções:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobname = 'process-rag-embeddings' 
-- ORDER BY start_time DESC 
-- LIMIT 10;