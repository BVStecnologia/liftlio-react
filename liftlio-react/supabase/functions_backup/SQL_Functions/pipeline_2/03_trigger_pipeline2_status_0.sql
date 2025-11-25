-- =============================================
-- Funcao: trigger_pipeline2_status_0
-- Descricao: Trigger para inicio IMEDIATO quando status muda para 0
-- Criado: 2025-11-25
-- =============================================

DROP FUNCTION IF EXISTS trigger_pipeline2_status_0() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_pipeline2_status_0()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_job_name TEXT;
    v_command TEXT;
BEGIN
    -- So dispara quando status MUDA para '0'
    IF NEW.status = '0' AND (OLD.status IS NULL OR OLD.status != '0') THEN

        -- Nome unico do job
        v_job_name := 'pipeline2_init_' || NEW.id::text;

        -- Remove job anterior se existir
        BEGIN
            PERFORM cron.unschedule(v_job_name);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Comando: chama pipeline2_process_project que ja trata status 0
        -- (coloca rodada=1 e muda status para 1)
        v_command := format(
            'SELECT pipeline2_process_project(%s); SELECT cron.unschedule(''pipeline2_init_%s'');',
            NEW.id,
            NEW.id
        );

        -- Agendar job para rodar em 2 segundos (praticamente imediato)
        -- Job se auto-remove apos executar
        PERFORM cron.schedule(v_job_name, '2 seconds', v_command);

        RAISE NOTICE 'Pipeline 2: Job % criado para projeto % (inicio imediato)',
            v_job_name, NEW.id;
    END IF;

    RETURN NEW;
END;
$function$;

-- =============================================
-- CRIAR TRIGGER NA TABELA PROJETO
-- =============================================

DROP TRIGGER IF EXISTS trigger_pipeline2_on_status_0 ON "Projeto";

CREATE TRIGGER trigger_pipeline2_on_status_0
AFTER UPDATE ON "Projeto"
FOR EACH ROW
WHEN (NEW.status = '0' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION trigger_pipeline2_status_0();

-- =============================================
-- COMENTARIOS
-- =============================================
-- Trigger de Inicio Imediato do Pipeline 2
--
-- PROBLEMA RESOLVIDO:
-- Antes, quando status mudava para 0, usuario esperava 30 segundos
-- ate o cron rodar. Isso era ruim para UX.
--
-- SOLUCAO:
-- Trigger dispara IMEDIATAMENTE quando status muda para 0
-- Cria um job de 2 segundos que:
--   1. Chama pipeline2_process_project()
--   2. Se auto-remove apos executar
--
-- FLUXO:
-- 1. Usuario/sistema muda status para 0
-- 2. Trigger dispara
-- 3. Job criado para rodar em 2 segundos
-- 4. pipeline2_process_project() executa
-- 5. Status muda para 1
-- 6. Job se auto-remove
-- 7. Cron de 30s continua o processamento
--
-- PROTECOES:
-- - So dispara quando status MUDA para 0 (nao se ja era 0)
-- - Remove job anterior se existir (evita duplicatas)
-- - Job se auto-remove (nao polui cron.job)
-- =============================================
