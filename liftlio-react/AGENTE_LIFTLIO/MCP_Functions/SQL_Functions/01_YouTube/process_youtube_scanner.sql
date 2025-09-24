-- =============================================
-- Função: process_youtube_scanner
-- Descrição: Processa scanners de vídeos do YouTube
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.process_youtube_scanner(project_id integer, scanner_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    keyword TEXT;
    current_page_token TEXT;
    video_ids TEXT := '';
    result JSONB;
    debug_info TEXT;
BEGIN
    -- Obter a keyword e o page_token do scanner
    SELECT "Keyword", "page_token"
    INTO keyword, current_page_token
    FROM "Scanner de videos do youtube"
    WHERE id = scanner_id;

    -- Chamar a função get_youtube_videos com base no page_token
    IF current_page_token IS NOT NULL AND current_page_token != '' THEN
        SELECT get_youtube_videos(
            project_id := project_id,
            search_term := keyword,
            max_results := 50,
            published_after := '2023-01-01'::timestamp,
            order_by := 'viewCount',
            region_code := 'US',
            page_token := current_page_token
        ) INTO result;
    ELSE
        SELECT get_youtube_videos(
            project_id := project_id,
            search_term := keyword,
            max_results := 50,
            published_after := '2023-01-01'::timestamp,
            order_by := 'viewCount',
            region_code := 'US'
        ) INTO result;
    END IF;

    -- Depuração: Armazenar a estrutura do resultado
    debug_info := result::TEXT;

    -- Tentar extrair os IDs dos vídeos do resultado
    IF result ? 'items' AND jsonb_array_length(result->'items') > 0 THEN
        SELECT string_agg(
            CASE
                WHEN item ? 'id' AND jsonb_typeof(item->'id') = 'object' THEN
                    (item->'id'->>'videoId')
                WHEN item ? 'id' AND jsonb_typeof(item->'id') = 'string' THEN
                    (item->>'id')
                WHEN item ? 'videoId' THEN
                    (item->>'videoId')
                ELSE NULL
            END,
            ','
        )
        INTO video_ids
        FROM jsonb_array_elements(result->'items') AS item
        WHERE 
            (item ? 'id' AND (jsonb_typeof(item->'id') = 'object' OR jsonb_typeof(item->'id') = 'string'))
            OR item ? 'videoId';
    END IF;

    -- Se video_ids ainda estiver vazio, use o debug_info
    IF video_ids IS NULL OR video_ids = '' THEN
        video_ids := 'DEBUG: ' || debug_info;
    END IF;

    -- Atualizar o campo "ID cache videos" na tabela do scanner
    UPDATE "Scanner de videos do youtube"
    SET "ID cache videos" = COALESCE("ID cache videos" || ',', '') || video_ids
    WHERE id = scanner_id;

    -- Atualizar o page_token para a próxima chamada
    UPDATE "Scanner de videos do youtube"
    SET page_token = result->>'nextPageToken'
    WHERE id = scanner_id;
END;
$function$
