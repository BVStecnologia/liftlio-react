-- =============================================
-- Função: buscar_dados_video
-- Descrição: Busca dados completos de um vídeo
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.buscar_dados_video(text);

CREATE OR REPLACE FUNCTION public.buscar_dados_video(youtube_video_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_key TEXT;
    api_url TEXT;
    response JSONB;
    video_data JSONB;
    error_msg TEXT;
BEGIN
    -- Buscar API key do Vault
    SELECT decrypted_secret INTO api_key
    FROM vault.decrypted_secrets
    WHERE name = 'YOUTUBE_API_KEY'
    LIMIT 1;

    IF api_key IS NULL THEN
        RAISE EXCEPTION 'YouTube API key não encontrada no Vault';
    END IF;

    -- Construir URL da API
    api_url := format(
        'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=%s&key=%s',
        youtube_video_id,
        api_key
    );

    -- Fazer requisição HTTP
    SELECT content::jsonb INTO response
    FROM http_get(api_url);

    -- Verificar se há erro na resposta
    IF response ? 'error' THEN
        error_msg := response->'error'->>'message';
        RAISE EXCEPTION 'Erro na API do YouTube: %', error_msg;
    END IF;

    -- Verificar se há items na resposta
    IF NOT response ? 'items' OR jsonb_array_length(response->'items') = 0 THEN
        RAISE EXCEPTION 'Vídeo não encontrado: %', youtube_video_id;
    END IF;

    -- Extrair dados do vídeo
    video_data := response->'items'->0;

    -- Adicionar timestamp de busca
    video_data := video_data || jsonb_build_object(
        'fetched_at', NOW(),
        'youtube_id', youtube_video_id
    );

    RETURN video_data;

EXCEPTION
    WHEN OTHERS THEN
        -- Registrar erro e retornar estrutura de erro
        RAISE WARNING 'Erro ao buscar dados do vídeo %: %', youtube_video_id, SQLERRM;
        RETURN jsonb_build_object(
            'error', true,
            'message', SQLERRM,
            'video_id', youtube_video_id,
            'timestamp', NOW()
        );
END;
$function$;