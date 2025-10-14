-- =============================================
-- Função: clean_project_jobs
-- Descrição: Trigger para limpar jobs de projeto quando deletado
-- Criado: 2025-01-24
-- Atualizado: Agenda limpeza de jobs via cron
-- =============================================

CREATE OR REPLACE FUNCTION public.clean_project_jobs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Agenda a limpeza em vez de executar diretamente
    PERFORM cron.schedule(
        'cleanup_' || OLD.id::text,
        '5 seconds',  -- executa em 5 segundos
        format('SELECT safe_unschedule_job(%L); SELECT safe_unschedule_job(%L);',
            'process_project_status_' || OLD.id::text,
            'cleanup_' || OLD.id::text
        )
    );
    RETURN OLD;
END;
$function$