-- =============================================
-- Função: get_vault_api_key
-- Descrição: Obtém API key do vault
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_vault_api_key(text);

CREATE OR REPLACE FUNCTION public.get_vault_api_key(secret_name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    api_key TEXT;
BEGIN
    -- Buscar a chave API do vault usando o nome fornecido
    api_key := get_secret(secret_name);

    IF api_key IS NULL THEN
        RAISE EXCEPTION 'API key "%" not found in vault', secret_name;
    END IF;

    RETURN api_key;
END;
$function$;