-- =============================================
-- Função: fetch_and_store_comments_for_video (versão 2 - com project_id)
-- Descrição: Busca e armazena comentários de um vídeo com project_id
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.fetch_and_store_comments_for_video(text, integer);

CREATE OR REPLACE FUNCTION public.fetch_and_store_comments_for_video(video_id_param text, project_id_param integer DEFAULT NULL::integer)
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
    v_video_table_id BIGINT;
BEGIN
    -- Buscar ID da tabela de vídeos
    SELECT id INTO v_video_table_id
    FROM public."Videos"
    WHERE youtube_id = video_id_param
    LIMIT 1;

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

    -- Loop através das páginas
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
                'error', response->'error'->>'message',
                'video_id', video_id_param
            );
        END IF;

        -- Processar cada comentário
        FOR comment_item IN SELECT * FROM jsonb_array_elements(response->'items')
        LOOP
            -- Inserir ou atualizar comentário com project_id
            INSERT INTO public."Comentarios_Principais" (
                youtube_comment_id,
                video_youtube_id,
                video_id,
                project_id,
                author_name,
                author_channel_id,
                comment_text,
                published_at,
                updated_at,
                like_count,
                reply_count,
                is_public,
                raw_data,
                created_at
            ) VALUES (
                comment_item->'id',
                video_id_param,
                v_video_table_id,
                project_id_param,
                comment_item->'snippet'->'topLevelComment'->'snippet'->>'authorDisplayName',
                comment_item->'snippet'->'topLevelComment'->'snippet'->'authorChannelId'->>'value',
                comment_item->'snippet'->'topLevelComment'->'snippet'->>'textDisplay',
                (comment_item->'snippet'->'topLevelComment'->'snippet'->>'publishedAt')::timestamptz,
                (comment_item->'snippet'->'topLevelComment'->'snippet'->>'updatedAt')::timestamptz,
                (comment_item->'snippet'->'topLevelComment'->'snippet'->>'likeCount')::int,
                (comment_item->'snippet'->>'totalReplyCount')::int,
                COALESCE((comment_item->'snippet'->'isPublic')::boolean, true),
                comment_item,
                NOW()
            )
            ON CONFLICT (youtube_comment_id) DO UPDATE SET
                like_count = EXCLUDED.like_count,
                reply_count = EXCLUDED.reply_count,
                updated_at = EXCLUDED.updated_at,
                raw_data = EXCLUDED.raw_data,
                project_id = COALESCE(EXCLUDED.project_id, "Comentarios_Principais".project_id),
                video_id = COALESCE(EXCLUDED.video_id, "Comentarios_Principais".video_id);

            IF FOUND THEN
                total_updated := total_updated + 1;
            ELSE
                total_inserted := total_inserted + 1;
            END IF;
        END LOOP;

        -- Verificar próxima página
        IF response ? 'nextPageToken' THEN
            next_page_token := response->>'nextPageToken';
        ELSE
            has_more_pages := FALSE;
        END IF;
    END LOOP;

    -- Atualizar contadores no vídeo se encontrado
    IF v_video_table_id IS NOT NULL THEN
        UPDATE public."Videos"
        SET
            comment_count = (
                SELECT COUNT(*)
                FROM public."Comentarios_Principais"
                WHERE video_id = v_video_table_id
            ),
            last_comment_fetch = NOW()
        WHERE id = v_video_table_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'video_id', video_id_param,
        'video_table_id', v_video_table_id,
        'project_id', project_id_param,
        'pages_processed', page_count,
        'comments_inserted', total_inserted,
        'comments_updated', total_updated,
        'total_processed', total_inserted + total_updated
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'video_id', video_id_param,
        'project_id', project_id_param
    );
END;
$function$;