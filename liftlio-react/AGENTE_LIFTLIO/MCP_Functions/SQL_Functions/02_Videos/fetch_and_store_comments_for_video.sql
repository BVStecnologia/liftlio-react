-- =============================================
-- Função: fetch_and_store_comments_for_video (versão 1 - sem parâmetros adicionais)
-- Descrição: Busca e armazena comentários de um vídeo
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.fetch_and_store_comments_for_video(text);

CREATE OR REPLACE FUNCTION public.fetch_and_store_comments_for_video(video_id_param text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_key TEXT;
    api_url TEXT;
    response JSONB;
    comment_item JSONB;
    total_inserted INT := 0;
    total_updated INT := 0;
    next_page_token TEXT;
    has_more_pages BOOLEAN := TRUE;
    page_count INT := 0;
    max_pages INT := 10;
BEGIN
    -- Obter API key
    SELECT decrypted_secret INTO api_key
    FROM vault.decrypted_secrets
    WHERE name = 'YOUTUBE_API_KEY'
    LIMIT 1;

    IF api_key IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'YouTube API key não encontrada'
        );
    END IF;

    -- Loop através das páginas de comentários
    WHILE has_more_pages AND page_count < max_pages LOOP
        page_count := page_count + 1;

        -- Construir URL
        api_url := format(
            'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=%s&maxResults=100&key=%s',
            video_id_param,
            api_key
        );

        IF next_page_token IS NOT NULL THEN
            api_url := api_url || '&pageToken=' || next_page_token;
        END IF;

        -- Fazer requisição
        SELECT content::jsonb INTO response
        FROM http_get(api_url);

        -- Verificar erro
        IF response ? 'error' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', response->'error'->>'message'
            );
        END IF;

        -- Processar comentários
        FOR comment_item IN SELECT * FROM jsonb_array_elements(response->'items')
        LOOP
            -- Inserir ou atualizar comentário principal
            INSERT INTO public."Comentarios_Principais" (
                youtube_comment_id,
                video_youtube_id,
                author_name,
                author_channel_id,
                comment_text,
                published_at,
                updated_at,
                like_count,
                reply_count,
                is_public,
                raw_data
            ) VALUES (
                comment_item->'id',
                video_id_param,
                comment_item->'snippet'->'topLevelComment'->'snippet'->>'authorDisplayName',
                comment_item->'snippet'->'topLevelComment'->'snippet'->>'authorChannelId',
                comment_item->'snippet'->'topLevelComment'->'snippet'->>'textDisplay',
                (comment_item->'snippet'->'topLevelComment'->'snippet'->>'publishedAt')::timestamptz,
                (comment_item->'snippet'->'topLevelComment'->'snippet'->>'updatedAt')::timestamptz,
                (comment_item->'snippet'->'topLevelComment'->'snippet'->>'likeCount')::int,
                (comment_item->'snippet'->>'totalReplyCount')::int,
                (comment_item->'snippet'->'topLevelComment'->'snippet'->>'isPublic')::boolean,
                comment_item
            )
            ON CONFLICT (youtube_comment_id) DO UPDATE SET
                like_count = EXCLUDED.like_count,
                reply_count = EXCLUDED.reply_count,
                updated_at = EXCLUDED.updated_at,
                raw_data = EXCLUDED.raw_data;

            GET DIAGNOSTICS total_inserted = total_inserted + ROW_COUNT;
        END LOOP;

        -- Verificar próxima página
        IF response ? 'nextPageToken' THEN
            next_page_token := response->>'nextPageToken';
        ELSE
            has_more_pages := FALSE;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'video_id', video_id_param,
        'pages_processed', page_count,
        'comments_processed', total_inserted
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$function$;