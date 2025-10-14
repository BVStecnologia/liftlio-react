-- =============================================
-- Fun��o: schedule_process_project
-- Descri��o: Trigger para agendar processamento de projeto baseado no status
-- Criado: 2025-01-24
-- Atualizado: Fun��o com prote��es contra loops infinitos
-- =============================================

CREATE OR REPLACE FUNCTION public.schedule_process_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_job_name TEXT;
    v_command TEXT;
    v_schedule TEXT;
    v_max_attempts INT := 100; -- M�ximo de execu��es por hora
    v_recent_executions INT;
BEGIN
    -- Valida��o inicial do status
    IF NEW.status IS NULL OR NEW.status NOT IN ('0', '1', '2', '3', '4', '5', '6') THEN
        RAISE NOTICE 'Status inv�lido ou nulo: %, ignorando trigger', NEW.status;
        RETURN NEW;
    END IF;

    -- Nome �nico do job baseado no projeto
    v_job_name := 'process_project_status_' || NEW.id::text;

    -- ===== PROTE��O 1: Verificar execu��es recentes =====
    -- Conta quantas vezes este job rodou na �ltima hora
    SELECT COUNT(*) INTO v_recent_executions
    FROM cron.job_run_details jrd
    JOIN cron.job j ON j.jobid = jrd.jobid
    WHERE j.jobname = v_job_name
      AND jrd.start_time > NOW() - INTERVAL '1 hour';

    -- Circuit breaker: para se executou demais
    IF v_recent_executions > v_max_attempts THEN
        RAISE WARNING 'CIRCUIT BREAKER: Job % executou % vezes na �ltima hora. Removendo job.',
                      v_job_name, v_recent_executions;
        PERFORM cron.unschedule(v_job_name);

        -- Log do problema
        INSERT INTO system_logs(operation, details, success)
        VALUES('CIRCUIT_BREAKER_TRIGGERED',
               format('Job %s bloqueado ap�s %s execu��es/hora', v_job_name, v_recent_executions),
               false);

        RETURN NEW;
    END IF;

    -- ===== PROTE��O 2: Sempre remover job anterior =====
    -- Garante que n�o h� duplica��o de jobs
    BEGIN
        PERFORM cron.unschedule(v_job_name);
    EXCEPTION WHEN OTHERS THEN
        -- Ignora erro se job n�o existir
        NULL;
    END;

    -- ===== PROTE��O 3: Validar se deve criar job =====
    -- Status 6 = cancelado/finalizado, n�o precisa job
    IF NEW.status = '6' THEN
        RAISE NOTICE 'Projeto % com status 6 (finalizado). N�o agendando jobs.', NEW.id;
        RETURN NEW;
    END IF;

    -- Verificar se integra��o � v�lida
    IF NOT COALESCE(NEW.integracao_valida, false) THEN
        RAISE NOTICE 'Projeto % sem integra��o v�lida. N�o agendando jobs.', NEW.id;
        RETURN NEW;
    END IF;

    -- ===== PROTE��O 4: Definir comando com valida��o embutida =====
    -- Cada comando deve verificar se ainda precisa rodar
    CASE NEW.status
        WHEN '0' THEN
            v_command := format(
                'SELECT CASE
                    WHEN (SELECT status FROM "Projeto" WHERE id = %1$s) = ''0''
                    THEN atualizar_scanner_rodada(%1$s)
                    ELSE NULL
                 END',
                NEW.id
            );

        WHEN '1' THEN
            v_command := format(
                'SELECT CASE
                    WHEN (SELECT status FROM "Projeto" WHERE id = %1$s) = ''1''
                    THEN process_next_project_scanner(%1$s)
                    ELSE NULL
                 END',
                NEW.id
            );

        WHEN '2' THEN
            v_command := format(
                'SELECT CASE
                    WHEN (SELECT status FROM "Projeto" WHERE id = %1$s) = ''2''
                    THEN update_video_stats(%1$s)
                    ELSE NULL
                 END',
                NEW.id
            );

        WHEN '3' THEN
            v_command := format(
                'SELECT CASE
                    WHEN (SELECT status FROM "Projeto" WHERE id = %1$s) = ''3''
                    THEN start_video_analysis_processing(%1$s)
                    ELSE NULL
                 END',
                NEW.id
            );

        WHEN '4' THEN
            v_command := format(
                'SELECT CASE
                    WHEN (SELECT status FROM "Projeto" WHERE id = %1$s) = ''4''
                    THEN start_comment_analysis_processing(%1$s)
                    ELSE NULL
                 END',
                NEW.id
            );

        WHEN '5' THEN
            v_command := format(
                'SELECT CASE
                    WHEN (SELECT status FROM "Projeto" WHERE id = %1$s) = ''5''
                    THEN start_engagement_messages_processing(%1$s)
                    ELSE NULL
                 END',
                NEW.id
            );

        ELSE
            RAISE NOTICE 'Status % n�o requer agendamento', NEW.status;
            RETURN NEW;
    END CASE;

    -- ===== PROTE��O 5: Intervalo seguro com backoff =====
    -- Aumenta intervalo baseado em execu��es recentes
    IF v_recent_executions > 50 THEN
        v_schedule := '30 seconds';  -- Desacelera se executou muito
    ELSIF v_recent_executions > 20 THEN
        v_schedule := '15 seconds';  -- Intervalo m�dio
    ELSE
        v_schedule := '7 seconds';   -- Intervalo original (mas com prote��es)
    END IF;

    -- ===== PROTE��O 6: Criar job com comando auto-validante =====
    BEGIN
        PERFORM cron.schedule(v_job_name, v_schedule, v_command);

        -- Log de cria��o
        RAISE NOTICE 'Job % agendado para rodar a cada % (comando: %)',
                     v_job_name, v_schedule, v_command;

        INSERT INTO system_logs(operation, details, success)
        VALUES('JOB_SCHEDULED',
               format('Job %s criado com intervalo %s para status %s',
                      v_job_name, v_schedule, NEW.status),
               true);

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Erro ao agendar job %: %', v_job_name, SQLERRM;

        INSERT INTO system_logs(operation, details, success)
        VALUES('JOB_SCHEDULE_ERROR',
               format('Erro criando job %s: %s', v_job_name, SQLERRM),
               false);
    END;

    RETURN NEW;
END;
$function$