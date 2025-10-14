-- =============================================
-- Função: get_message_processing_status
-- Descrição: Obtém status do processamento de mensagens, incluindo contadores e porcentagem de conclusão
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_message_processing_status(project_id integer)
 RETURNS TABLE(remaining_count bigint, total_leads bigint, completion_percentage numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH counts AS (
        SELECT
            COUNT(*) FILTER (WHERE cp.mensagem IS NULL OR cp.mensagem = false) as remaining,
            COUNT(*) as total
        FROM "Comentarios_Principais" cp
        JOIN "Videos" v ON cp.video_id = v.id
        JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
        WHERE s."Projeto_id" = project_id
        AND cp.led = true
    )
    SELECT
        remaining,
        total,
        ROUND(((total - remaining)::NUMERIC / NULLIF(total::NUMERIC, 0)) * 100, 2)
    FROM counts;
END;
$function$