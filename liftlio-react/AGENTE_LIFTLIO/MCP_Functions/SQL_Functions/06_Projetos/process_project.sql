-- =============================================
-- Função: process_project
-- Descrição: Processa um projeto completo com todos os passos
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.process_project(integer);

CREATE OR REPLACE FUNCTION public.process_project(project_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_job_exists BOOLEAN;
BEGIN
    -- Verifica e limpa jobs existentes
    SELECT EXISTS (
        SELECT 1 
        FROM cron.job 
        WHERE jobname = 'project_step_1_' || project_id::text
    ) INTO v_job_exists;
    
    IF v_job_exists THEN
        PERFORM cron.unschedule('project_step_1_' || project_id::text);
    END IF;

    -- Limpa outros possíveis jobs pendentes
    SELECT EXISTS (
        SELECT 1 
        FROM cron.job 
        WHERE jobname = 'check_analysis_' || project_id::text
    ) INTO v_job_exists;
    
    IF v_job_exists THEN
        PERFORM cron.unschedule('check_analysis_' || project_id::text);
    END IF;

    SELECT EXISTS (
        SELECT 1 
        FROM cron.job 
        WHERE jobname = 'check_comments_' || project_id::text
    ) INTO v_job_exists;
    
    IF v_job_exists THEN
        PERFORM cron.unschedule('check_comments_' || project_id::text);
    END IF;

    -- Inicia diretamente o processamento
    PERFORM atualizar_cache_e_stats(project_id);
    PERFORM remove_duplicate_videos(project_id);
    PERFORM start_video_processing(project_id);
    
    -- Agenda verificação de vídeos
    PERFORM cron.schedule(
        'check_videos_' || project_id::text,
        '30 seconds',
        format('SELECT check_videos_and_continue(%s)', project_id)
    );
    
    RETURN 'Processamento iniciado para o projeto ' || project_id;
END;
$function$;