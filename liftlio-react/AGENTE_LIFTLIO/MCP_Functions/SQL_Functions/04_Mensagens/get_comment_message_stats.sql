-- =============================================
-- Função: get_comment_message_stats
-- Descrição: Obtém estatísticas de comentários leads com e sem mensagens para um projeto
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_comment_message_stats(p_project_id integer)
 RETURNS TABLE(lead_comments_with_message bigint, lead_comments_without_message bigint, total_lead_comments bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_with_message_count BIGINT;
    v_without_message_count BIGINT;
    v_total_count BIGINT;
BEGIN
    -- Calculamos o total de comentários LEAD com mensagem
    SELECT COUNT(*)
    INTO v_with_message_count
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN "Projeto" p ON s."Projeto_id" = p.id
    WHERE p.id = p_project_id
    AND cp.led = true  -- Apenas comentários que são leads
    AND cp.mensagem = true;

    -- Calculamos o total de comentários LEAD sem mensagem
    SELECT COUNT(*)
    INTO v_without_message_count
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN "Projeto" p ON s."Projeto_id" = p.id
    WHERE p.id = p_project_id
    AND cp.led = true  -- Apenas comentários que são leads
    AND (cp.mensagem = false OR cp.mensagem IS NULL);

    -- Calculamos o total de comentários LEAD do projeto
    v_total_count := v_with_message_count + v_without_message_count;

    -- Retornamos os resultados
    RETURN QUERY
    SELECT
        v_with_message_count as lead_comments_with_message,
        v_without_message_count as lead_comments_without_message,
        v_total_count as total_lead_comments;
END;
$function$