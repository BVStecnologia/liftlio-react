-- =============================================
-- Fun��o: cleanup_project_jobs
-- Descri��o: Trigger para limpar jobs quando projeto � exclu�do
-- Criado: 2025-01-24
-- Atualizado: Remove jobs do cron quando projeto � deletado
-- =============================================

CREATE OR REPLACE FUNCTION public.cleanup_project_jobs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Tenta cancelar o job associado ao projeto que est� sendo exclu�do
    BEGIN
        PERFORM cron.unschedule('process_project_status_' || OLD.id::text);
        RAISE NOTICE 'Job para projeto % removido com sucesso.', OLD.id;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover job para projeto %: %', OLD.id, SQLERRM;
    END;

    RETURN OLD;
END;
$function$