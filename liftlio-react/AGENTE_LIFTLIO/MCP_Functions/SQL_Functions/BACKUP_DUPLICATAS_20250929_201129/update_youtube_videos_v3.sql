-- =============================================
-- Função: update_youtube_videos (versão 3 - com project_id e scanner_id)
-- Descrição: Atualiza vídeos do YouTube para scanner específico
-- Parâmetros: project_id_param integer, scanner_id_param bigint
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.update_youtube_videos(project_id_param integer, scanner_id_param bigint)
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
BEGIN
    -- Seleciona a entrada específica da tabela usando o scanner_id_param
    SELECT "Keyword", page_token, "ID cache videos"
    INTO v_keyword, v_page_token, v_id_cache
    FROM public."Scanner de videos do youtube"
    WHERE id = scanner_id_param AND "Ativa?" = true;

    -- Se a entrada for encontrada e estiver ativa, procede com a busca de vídeos
    IF v_keyword IS NOT NULL THEN
        -- Log dos parâmetros
        RAISE NOTICE 'Chamando get_youtube_videos com: project_id: %, search_term: %, page_token: %',
                     project_id_param, v_keyword, COALESCE(v_page_token, 'NULL');

        -- Prepara a chamada da função get_youtube_videos
        SELECT get_youtube_videos(
            project_id := project_id_param,
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
            v_id_cache := v_id_cache || CASE WHEN v_id_cache = '' THEN '' ELSE ',' END || (v_item->'id'->>'videoId');
        END LOOP;

        -- Atualiza a tabela com os resultados
        UPDATE public."Scanner de videos do youtube"
        SET "ID cache videos" = v_id_cache,
            page_token = COALESCE(v_result_json->>'nextPageToken', '')
        WHERE id = scanner_id_param;

        RAISE NOTICE 'Atualização concluída. Novos IDs: %, Novo page_token: %', v_id_cache, COALESCE(v_result_json->>'nextPageToken', '');
    ELSE
        RAISE EXCEPTION 'Scanner com ID % não encontrado ou não está ativo', scanner_id_param;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao atualizar vídeos do YouTube: %. Detalhes: %', SQLERRM, v_result;
END;
$function$