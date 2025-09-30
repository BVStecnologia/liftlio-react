-- =============================================
-- Função: get_my_channel_videos
-- Descrição: Obtém vídeos do canal do usuário autenticado
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_my_channel_videos(integer, integer, text, text, timestamp without time zone);

CREATE OR REPLACE FUNCTION public.get_my_channel_videos(project_id integer, max_results integer DEFAULT 25, order_by text DEFAULT 'date'::text, page_token text DEFAULT NULL::text, published_after timestamp without time zone DEFAULT NULL::timestamp without time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    channel_info JSONB;
    my_channel_id TEXT;
    videos_response JSONB;
BEGIN
    -- Buscar informações do meu canal (usuário autenticado)
    SELECT get_youtube_channel_info(project_id, 'id') INTO channel_info;

    -- Extrair o ID do canal da resposta
    my_channel_id := (channel_info->'items'->0->>'id');

    -- Verificar se conseguiu obter o ID do canal
    IF my_channel_id IS NULL THEN
        RAISE EXCEPTION 'Não foi possível obter o ID do canal do usuário autenticado';
    END IF;

    -- Buscar os vídeos do meu canal usando a função existente
    videos_response := (
        SELECT search_youtube_channel_videos(
            project_id := project_id,
            channel_id := my_channel_id,
            max_results := max_results,
            order_by := order_by,
            page_token := page_token,
            published_after := published_after
        )
    );

    -- Retornar os vídeos
    RETURN videos_response;
END;
$function$;