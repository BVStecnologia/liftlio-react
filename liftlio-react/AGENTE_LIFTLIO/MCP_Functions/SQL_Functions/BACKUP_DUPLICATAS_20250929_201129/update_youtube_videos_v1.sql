-- =============================================
-- Fun��o: update_youtube_videos (vers�o 1 - sem par�metros)
-- Descri��o: Atualiza v�deos do YouTube (projeto fixo 12)
-- Par�metros: nenhum
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.update_youtube_videos()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_keyword VARCHAR;
    v_page_token TEXT;
    v_result RECORD;
    v_id_cache VARCHAR;
BEGIN
    -- Verifica se h� uma entrada ativa na tabela
    SELECT "Keyword", page_token
    INTO v_keyword, v_page_token
    FROM public."Scanner de videos do youtube"
    WHERE "Ativa?" = true
    LIMIT 1;

    -- Se houver uma entrada ativa, procede com a busca de v�deos
    IF v_keyword IS NOT NULL THEN
        -- Prepara a chamada da fun��o get_youtube_videos
        IF v_page_token IS NULL OR v_page_token = '' THEN
            -- Primeira rodada, sem page_token
            SELECT * INTO v_result FROM get_youtube_videos(
                project_id := 12,
                search_term := v_keyword,
                max_results := 50,
                published_after := '2023-01-01'::timestamp,
                order_by := 'viewCount',
                region_code := 'US'
            );
        ELSE
            -- Rodadas subsequentes, com page_token
            SELECT * INTO v_result FROM get_youtube_videos(
                project_id := 12,
                search_term := v_keyword,
                max_results := 50,
                published_after := '2023-01-01'::timestamp,
                order_by := 'viewCount',
                region_code := 'US',
                page_token := v_page_token
            );
        END IF;

        -- Atualiza a tabela com os resultados
        v_id_cache := v_result.video_ids;

        UPDATE public."Scanner de videos do youtube"
        SET "ID cache videos" = v_id_cache,
            page_token = v_result.next_page_token
        WHERE "Ativa?" = true;
    END IF;
END;
$function$