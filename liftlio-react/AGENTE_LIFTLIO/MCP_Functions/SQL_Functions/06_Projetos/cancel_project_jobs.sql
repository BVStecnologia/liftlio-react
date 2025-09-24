-- =============================================
-- Função: cancel_project_jobs
-- Descrição: Cancela jobs agendados para um projeto específico
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.cancel_project_jobs(projeto_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_job_name TEXT;
    v_job_exists BOOLEAN;
BEGIN
    v_job_name := 'process_project_status_' || projeto_id::text;

    -- Verifica se o job existe
    SELECT EXISTS (
        SELECT 1
        FROM cron.job
        WHERE jobname = v_job_name
    ) INTO v_job_exists;

    IF v_job_exists THEN
        PERFORM cron.unschedule(v_job_name);
        RETURN 'Job para projeto ' || projeto_id || ' cancelado com sucesso.';
    ELSE
        RETURN 'Nenhum job encontrado para o projeto ' || projeto_id || '.';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN 'Erro ao cancelar job para projeto ' || projeto_id || ': ' || SQLERRM;
END;
$function$