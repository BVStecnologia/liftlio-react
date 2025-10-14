-- =============================================
-- Função: get_clean_template_messages
-- Descrição: Obtém templates limpos de mensagens para um projeto, removendo mentions e URLs
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_clean_template_messages(project_id integer, message_type integer DEFAULT NULL::integer)
 RETURNS TABLE(clean_text text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT
        'exemplo ' || ROW_NUMBER() OVER (ORDER BY m.created_at DESC) ||
        ' Comentário: ' ||
        TRIM(BOTH FROM cp.text_display) ||
        ' Resposta: ' ||
        TRIM(BOTH FROM regexp_replace(
            regexp_replace(m.mensagem, '@\\w+\\s*', ''),
            'https?://\\S+', ''
        ))
    FROM "Comentarios_Principais" cp
    JOIN "Videos" v ON cp.video_id = v.id
    JOIN "Scanner de videos do youtube" s ON v.scanner_id = s.id
    JOIN "Mensagens" m ON m."Comentario_Principais" = cp.id
    WHERE s."Projeto_id" = project_id
    AND m.template = true
    AND (
        message_type IS NULL  -- Se NULL, retorna todos os tipos
        OR m.tipo_msg = message_type  -- Se especificado, filtra pelo tipo
    )
    ORDER BY m.created_at DESC
    LIMIT 20;
$function$