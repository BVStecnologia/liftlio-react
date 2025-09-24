-- =============================================
-- Função: check_and_refresh_youtube_token
-- Descrição: Trigger para verificar e renovar token YouTube automaticamente
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.check_and_refresh_youtube_token();

CREATE OR REPLACE FUNCTION public.check_and_refresh_youtube_token()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    refresh_result JSONB;
BEGIN
    -- Verifica se o token está prestes a expirar
    IF (NEW."Ultima atualização" + (NEW."expira em" - 10) * INTERVAL '1 second') < CURRENT_TIMESTAMP THEN
        -- Chama a função para atualizar o token
        SELECT refresh_youtube_token(NEW."Refresh token") INTO refresh_result;

        -- Atualiza os campos com os novos valores
        NEW."Token" = refresh_result->>'access_token';
        NEW."expira em" = (refresh_result->>'expires_in')::int4;
        NEW."Ultima atualização" = CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$function$;