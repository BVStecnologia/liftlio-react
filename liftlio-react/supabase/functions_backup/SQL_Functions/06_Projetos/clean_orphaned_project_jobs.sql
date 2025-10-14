-- =============================================
-- Fun��o: clean_orphaned_project_jobs
-- Descri��o: Limpa jobs de projetos que n�o existem mais
-- Criado: 2025-01-24
-- Atualizado: Remove jobs �rf�os do cron
-- =============================================

CREATE OR REPLACE FUNCTION public.clean_orphaned_project_jobs()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    job_record record;
    project_id integer;
    jobs_cleaned integer := 0;
    result text;
BEGIN
    -- Buscar todos os jobs de projetos
    FOR job_record IN
        SELECT jobid, jobname
        FROM cron.job
        WHERE jobname LIKE 'process_project_status_%'
    LOOP
        -- Extrair o ID do projeto do nome do job
        project_id := substring(job_record.jobname FROM 'process_project_status_([0-9]+)')::integer;

        -- Verificar se o projeto existe
        IF NOT EXISTS (SELECT 1 FROM "Projeto" WHERE id = project_id) THEN
            -- Projeto n�o existe, remover o job
            BEGIN
                PERFORM cron.unschedule(job_record.jobid);
                jobs_cleaned := jobs_cleaned + 1;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao remover job �rf�o %: %', job_record.jobname, SQLERRM;
            END;

            -- Tamb�m remover job de cleanup relacionado, se existir
            BEGIN
                PERFORM cron.unschedule('cleanup_' || project_id);
            EXCEPTION WHEN OTHERS THEN
                -- Ignorar erros nesta parte
            END;
        END IF;
    END LOOP;

    result := 'Limpeza conclu�da. ' || jobs_cleaned || ' jobs �rf�os removidos.';
    RETURN result;
END;
$function$