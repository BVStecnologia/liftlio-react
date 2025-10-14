-- =============================================
-- Função: get_secret
-- Descrição: Obtém secrets do Vault do Supabase
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_secret(text);

CREATE OR REPLACE FUNCTION public.get_secret(secret_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    secret_value TEXT;
BEGIN
    SELECT decrypted_secret INTO secret_value
    FROM vault.decrypted_secrets
    WHERE name = secret_name;

    IF secret_value IS NULL THEN
        RAISE EXCEPTION 'Secret not found: %', secret_name;
    END IF;

    RETURN secret_value;
END;
$function$;