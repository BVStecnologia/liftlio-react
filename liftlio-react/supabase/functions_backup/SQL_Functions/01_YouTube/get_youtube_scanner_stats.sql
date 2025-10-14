-- =============================================
-- Função: get_youtube_scanner_stats
-- Descrição: Obtém estatísticas dos scanners YouTube de um projeto
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_scanner_stats(bigint);

CREATE OR REPLACE FUNCTION public.get_youtube_scanner_stats(project_id bigint)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    pending_count INTEGER;
    processed_count INTEGER;
    failed_count INTEGER;
BEGIN
    -- Conta scanners pendentes
    SELECT COUNT(*) INTO pending_count
    FROM public."Scanner de videos do youtube"
    WHERE "Projeto_id" = project_id
    AND rodada IS NOT NULL;

    -- Conta scanners processados
    SELECT COUNT(*) INTO processed_count
    FROM public."Scanner de videos do youtube"
    WHERE "Projeto_id" = project_id
    AND rodada IS NULL
    AND "ID cache videos" IS NOT NULL;

    -- Conta scanners com falha
    SELECT COUNT(*) INTO failed_count
    FROM public."Scanner de videos do youtube"
    WHERE "Projeto_id" = project_id
    AND rodada IS NULL
    AND last_attempt_failed = TRUE;

    RETURN json_build_object(
        'project_id', project_id,
        'pending_scanners', pending_count,
        'processed_scanners', processed_count,
        'failed_scanners', failed_count,
        'total_scanners', pending_count + processed_count + failed_count
    );
END;
$function$;