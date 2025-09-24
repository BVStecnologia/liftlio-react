-- =============================================
-- Função: cleanup_project_jobs
-- Descrição: Trigger para limpar jobs quando projeto é excluído
-- Criado: 2025-01-24
-- Atualizado: Remove jobs do cron quando projeto é deletado
-- =============================================

CREATE OR REPLACE FUNCTION public.cleanup_project_jobs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Tenta cancelar o job associado ao projeto que está sendo excluído
    BEGIN
        PERFORM cron.unschedule('process_project_status_' || OLD.id::text);
        RAISE NOTICE 'Job para projeto % removido com sucesso.', OLD.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover job para projeto %: %', OLD.id, SQLERRM;
    END;

    RETURN OLD;
END;
$function$