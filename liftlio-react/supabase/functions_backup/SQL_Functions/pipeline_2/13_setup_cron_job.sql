-- =============================================
-- Função: setup_pipeline_cron_job
-- Descrição: Configura cron job para processar projeto automaticamente
-- Criado: 2025-11-14
-- =============================================

DROP FUNCTION IF EXISTS setup_pipeline_cron_job(BIGINT, INTEGER);

CREATE OR REPLACE FUNCTION public.setup_pipeline_cron_job(
    project_id_param BIGINT,
    interval_minutes INTEGER DEFAULT 10
)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_job_name TEXT;
    v_schedule TEXT;
    v_command TEXT;
    v_job_exists BOOLEAN;
BEGIN
    -- Criar nome do job
    v_job_name := 'pipeline2_project_' || project_id_param;

    -- Verificar se job já existe
    SELECT EXISTS (
        SELECT 1 FROM cron.job
        WHERE jobname = v_job_name
    ) INTO v_job_exists;

    -- Se já existe, remover primeiro
    IF v_job_exists THEN
        PERFORM cron.unschedule(v_job_name);
        RAISE NOTICE 'Job existente % removido', v_job_name;
    END IF;

    -- Criar schedule no formato cron
    -- Exemplos:
    -- - 5 min: '*/5 * * * *'
    -- - 10 min: '*/10 * * * *'
    -- - 15 min: '*/15 * * * *'
    v_schedule := '*/' || interval_minutes || ' * * * *';

    -- Criar comando SQL
    v_command := 'SELECT process_next_project_scanner(' || project_id_param || ')';

    -- Agendar job
    PERFORM cron.schedule(
        v_job_name,
        v_schedule,
        v_command
    );

    RAISE NOTICE 'Job % agendado: a cada % minutos', v_job_name, interval_minutes;

    RETURN format(
        'SUCCESS: Cron job "%s" configurado para rodar a cada %s minutos. Comando: %s',
        v_job_name,
        interval_minutes,
        v_command
    );
END;
$function$;

-- =============================================
-- Função: stop_pipeline_cron_job
-- Descrição: Para cron job de um projeto
-- =============================================

DROP FUNCTION IF EXISTS stop_pipeline_cron_job(BIGINT);

CREATE OR REPLACE FUNCTION public.stop_pipeline_cron_job(project_id_param BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    v_job_name TEXT;
    v_job_exists BOOLEAN;
BEGIN
    -- Criar nome do job
    v_job_name := 'pipeline2_project_' || project_id_param;

    -- Verificar se job existe
    SELECT EXISTS (
        SELECT 1 FROM cron.job
        WHERE jobname = v_job_name
    ) INTO v_job_exists;

    -- Se não existe, retornar aviso
    IF NOT v_job_exists THEN
        RETURN 'WARNING: Job ' || v_job_name || ' não está ativo.';
    END IF;

    -- Remover job
    PERFORM cron.unschedule(v_job_name);

    RAISE NOTICE 'Job % removido', v_job_name;

    RETURN format('SUCCESS: Cron job "%s" parado.', v_job_name);
END;
$function$;

-- =============================================
-- Função: list_pipeline_cron_jobs
-- Descrição: Lista todos os cron jobs ativos do Pipeline 2
-- =============================================

DROP FUNCTION IF EXISTS list_pipeline_cron_jobs();

CREATE OR REPLACE FUNCTION public.list_pipeline_cron_jobs()
RETURNS TABLE(
    job_name TEXT,
    schedule TEXT,
    command TEXT,
    active BOOLEAN
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        jobname::TEXT,
        cron.schedule::TEXT,
        cron.command::TEXT,
        cron.active
    FROM cron.job
    WHERE jobname LIKE 'pipeline2_project_%'
    ORDER BY jobname;
END;
$function$;

-- =============================================
-- COMENTÁRIOS
-- =============================================
-- Setup de Cron Jobs para Automação do Pipeline 2
--
-- Estas funções configuram e gerenciam cron jobs para processar
-- projetos automaticamente em intervalos regulares.
--
-- SETUP (CONFIGURAR AUTOMAÇÃO):
-- ```sql
-- -- Configurar processamento automático a cada 10 minutos
-- SELECT setup_pipeline_cron_job(117, 10);
-- -- Resultado: "SUCCESS: Cron job 'pipeline2_project_117' configurado..."
--
-- -- Configurar com intervalo diferente (5 minutos)
-- SELECT setup_pipeline_cron_job(117, 5);
--
-- -- Configurar outro projeto
-- SELECT setup_pipeline_cron_job(35, 15);  -- A cada 15 min
-- ```
--
-- STOP (PARAR AUTOMAÇÃO):
-- ```sql
-- -- Parar processamento automático do projeto 117
-- SELECT stop_pipeline_cron_job(117);
-- -- Resultado: "SUCCESS: Cron job 'pipeline2_project_117' parado."
-- ```
--
-- LIST (LISTAR JOBS ATIVOS):
-- ```sql
-- -- Ver todos os cron jobs ativos do Pipeline 2
-- SELECT * FROM list_pipeline_cron_jobs();
-- ```
--
-- COMO FUNCIONA:
-- 1. setup_pipeline_cron_job(project_id, interval_minutes)
--    - Cria cron job com nome: "pipeline2_project_{ID}"
--    - Schedule: a cada N minutos (*/N * * * *)
--    - Comando: SELECT process_next_project_scanner(project_id)
-- 2. Cron executa automaticamente no intervalo definido
-- 3. process_next_project_scanner():
--    - Pega próximo scanner (rotação circular)
--    - Verifica se tem cache de IDs
--    - Inicializa se necessário
--    - Processa vídeos (1 step por vez)
--    - Quando scanner completa → rotaciona para próximo
-- 4. Processo roda infinitamente (circular)
--
-- FLUXO AUTOMÁTICO COMPLETO:
-- ```
-- 1. Cron chama a cada N minutos
--    ↓
-- 2. process_next_project_scanner(117)
--    ↓
-- 3. get_next_scanner_to_process(117) → retorna 584
--    ↓
-- 4. Verifica cache de 584
--    ├─ Vazio: retorna WAITING (sistema busca IDs)
--    └─ Cheio: continua
--    ↓
-- 5. initialize_scanner_processing(584) se necessário
--    ↓
-- 6. process_scanner_videos(584)
--    ├─ Processa vídeo 1 (avança 1 step)
--    ├─ Processa vídeo 2 (avança 1 step)
--    └─ Processa vídeo N (avança 1 step)
--    ↓
-- 7. Próximo cron: repete 2-6
--    - Vídeos avançam mais 1 step cada
--    ↓
-- 8. Quando scanner 584 completa TODOS vídeos
--    - Próximo cron rotaciona para scanner 585
--    ↓
-- 9. Quando 585 completa → rotaciona para 586
--    ↓
-- 10. Quando 586 completa → volta para 584 (CIRCULAR!)
-- ```
--
-- VANTAGENS:
-- - ✅ Zero intervenção manual
-- - ✅ Processamento contínuo 24/7
-- - ✅ Rotação automática de keywords
-- - ✅ Auto-recuperação de erros
-- - ✅ Processamento paralelo de vídeos
-- - ✅ Múltiplos projetos simultaneamente
-- - ✅ Configuração simples (1 linha SQL)
--
-- RECOMENDAÇÕES:
-- - Intervalo ideal: 10-15 minutos
-- - Muito rápido (<5 min): pode estressar API do YouTube
-- - Muito lento (>30 min): processamento lento
-- - Projetos grandes: 15 minutos
-- - Projetos pequenos: 10 minutos
--
-- MONITORAMENTO:
-- ```sql
-- -- Ver jobs ativos
-- SELECT * FROM list_pipeline_cron_jobs();
--
-- -- Ver progresso de um projeto
-- SELECT
--     scanner_id,
--     COUNT(*) as total_videos,
--     SUM(CASE WHEN pipeline_completo THEN 1 ELSE 0 END) as completos,
--     AVG(current_step) as avg_step
-- FROM pipeline_processing
-- WHERE project_id = 117
-- GROUP BY scanner_id;
--
-- -- Ver últimas execuções do cron
-- SELECT * FROM cron.job_run_details
-- WHERE jobname LIKE 'pipeline2_project_%'
-- ORDER BY start_time DESC
-- LIMIT 20;
-- ```
-- =============================================
