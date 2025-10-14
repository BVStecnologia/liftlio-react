-- =============================================
-- Função: search_and_get_video_stats
-- Descrição: Busca vídeos por palavras-chave e retorna estatísticas
-- Criado: 2025-01-24
-- =============================================

CREATE OR REPLACE FUNCTION public.search_and_get_video_stats(project_id integer, keywords text[], max_results_per_keyword integer DEFAULT 50, published_after timestamp without time zone DEFAULT '2000-01-01 00:00:00'::timestamp without time zone, order_by text DEFAULT 'viewCount'::text, region_code text DEFAULT 'US'::text)
 RETURNS TABLE(keyword text, video_id text, title text, channel_title text, published_at timestamp without time zone, view_count bigint, like_count bigint, comment_count bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    keyword TEXT;
    video_data JSONB;
    video_ids TEXT[];
    video_stats JSONB;
    page_token TEXT;
    video JSONB;
    stat JSONB;
BEGIN
    FOREACH keyword IN ARRAY keywords
    LOOP
        page_token := NULL;
        video_ids := ARRAY[]::TEXT[];

        WHILE array_length(video_ids, 1) < max_results_per_keyword
        LOOP
            -- Buscar vídeos
            video_data := get_youtube_videos(
                project_id := project_id,
                search_term := keyword,
                max_results := LEAST(50, max_results_per_keyword - array_length(video_ids, 1)),
                published_after := published_after,
                order_by := order_by,
                region_code := region_code,
                page_token := page_token
            );

            -- Coletar IDs de vídeo
            FOR video IN SELECT * FROM jsonb_array_elements(video_data->'items')
            LOOP
                video_ids := array_append(video_ids, video->'id'->>'videoId');
            END LOOP;

            page_token := video_data->>'nextPageToken';
            EXIT WHEN page_token IS NULL OR array_length(video_ids, 1) >= max_results_per_keyword;
        END LOOP;

        IF array_length(video_ids, 1) > 0 THEN
            -- Obter estatísticas para os vídeos coletados
            video_stats := get_youtube_video_stats(
                project_id := project_id,
                video_ids := array_to_string(video_ids, ','),
                parts := 'statistics,snippet'
            );

            -- Processar e retornar os resultados
            FOR stat IN SELECT * FROM jsonb_array_elements(video_stats->'items')
            LOOP
                video_id := stat->'id'::TEXT;
                title := stat->'snippet'->>'title';
                channel_title := stat->'snippet'->>'channelTitle';
                published_at := (stat->'snippet'->>'publishedAt')::TIMESTAMP;
                view_count := (stat->'statistics'->>'viewCount')::BIGINT;
                like_count := (stat->'statistics'->>'likeCount')::BIGINT;
                comment_count := (stat->'statistics'->>'commentCount')::BIGINT;

                RETURN NEXT;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$