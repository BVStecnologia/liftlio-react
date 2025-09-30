-- =============================================
-- Função: update_youtube_videos (versão 4 - apenas scanner_id)
-- Descrição: Atualiza vídeos do YouTube usando apenas scanner_id
-- Parâmetros: scanner_id bigint
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.update_youtube_videos(scanner_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_keyword VARCHAR;
    v_page_token TEXT;
    v_result TEXT;
    v_result_json JSONB;
    v_id_cache TEXT := '';
    v_item JSONB;
    v_project_id INT;
    v_is_active BOOLEAN;
BEGIN
    -- Verifica se a entrada está ativa e obtém os dados necessários
    SELECT "Ativa?", "Keyword", page_token, "Videos"
    INTO v_is_active, v_keyword, v_page_token, v_project_id
    FROM public."Scanner de videos do youtube"
    WHERE id = scanner_id;

    -- Se a entrada estiver ativa, procede com a busca de vídeos
    IF v_is_active THEN
        -- Prepara a chamada da função get_youtube_videos
        SELECT get_youtube_videos(
            project_id := v_project_id,
            search_term := v_keyword,
            max_results := 50,
            published_after := '2023-01-01'::timestamp,
            order_by := 'viewCount',
            region_code := 'US',
            page_token := COALESCE(v_page_token, '')
        ) INTO v_result;

        -- Converte o resultado para JSONB
        v_result_json := v_result::jsonb;

        -- Extrai os IDs dos vídeos do resultado
        FOR v_item IN SELECT jsonb_array_elements(v_result_json->'items')
        LOOP
            v_id_cache := v_id_cache || (v_item->'id'->>'videoId') || ',';
        END LOOP;

        -- Remove a última vírgula
        v_id_cache := rtrim(v_id_cache, ',');

        -- Atualiza a tabela com os resultados
        UPDATE public."Scanner de videos do youtube"
        SET "ID cache videos" = CASE
                WHEN "ID cache videos" IS NULL OR "ID cache videos" = ''
                THEN v_id_cache
                ELSE "ID cache videos" || ',' || v_id_cache
            END,
            page_token = v_result_json->>'nextPageToken'
        WHERE id = scanner_id;
    ELSE
        RAISE NOTICE 'O scanner com ID % não está ativo.', scanner_id;
    END IF;
END;
$function$