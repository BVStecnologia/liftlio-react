-- =============================================
-- Função: get_message_stats
-- Descrição: Obtém estatísticas de comentários com e sem mensagens para um projeto específico
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_message_stats(p_project_id integer)
 RETURNS TABLE(comments_with_message bigint, comments_without_message bigint, total_comments bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_with_message BIGINT;
    v_without_message BIGINT;
    v_total BIGINT;
BEGIN
    -- Conta comentários com mensagem
    SELECT COUNT(*)
    INTO v_with_message
    FROM public."Comentarios_Principais" c
    JOIN public."Videos" v ON c.video_id = v.id
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id
    AND c.mensagem = true;

    -- Conta comentários sem mensagem
    SELECT COUNT(*)
    INTO v_without_message
    FROM public."Comentarios_Principais" c
    JOIN public."Videos" v ON c.video_id = v.id
    JOIN public."Scanner de videos do youtube" s ON v.scanner_id = s.id
    WHERE s."Projeto_id" = p_project_id
    AND (c.mensagem = false OR c.mensagem IS NULL);

    -- Calcula total
    v_total := v_with_message + v_without_message;

    -- Retorna os resultados
    RETURN QUERY
    SELECT
        v_with_message as comments_with_message,
        v_without_message as comments_without_message,
        v_total as total_comments;
END;
$function$