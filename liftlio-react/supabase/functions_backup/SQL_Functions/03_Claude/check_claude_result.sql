-- =============================================
-- Função: check_claude_result
-- Descrição: Verifica o resultado de uma requisição Claude assíncrona
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.check_claude_result(request_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    result TEXT;
BEGIN
    SELECT response INTO result
    FROM claude_requests
    WHERE id = request_id;

    IF result IS NULL THEN
        RETURN 'Ainda processando...';
    ELSE
        RETURN result;
    END IF;
END;
$function$