-- =============================================
-- Função: get_youtube_api_key
-- Descrição: Obtém a chave API do YouTube do vault
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_youtube_api_key();

CREATE OR REPLACE FUNCTION public.get_youtube_api_key()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_key TEXT;
BEGIN
    -- Buscar a chave API diretamente do vault usando o nome correto
    api_key := get_secret('Youtube Key');

    IF api_key IS NULL THEN
        RAISE EXCEPTION 'YouTube API key not found in vault';
    END IF;

    RETURN api_key;
END;
$function$;