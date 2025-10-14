-- =============================================
-- Função: get_api_text
-- Descrição: Extrai texto da resposta da API
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.get_api_text(text);

CREATE OR REPLACE FUNCTION public.get_api_text(input_value text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
    text_value TEXT;
BEGIN
    -- Chamar a função principal
    result := call_api_edge_function(input_value);

    -- Extrair apenas o campo 'text' da resposta
    text_value := result->>'text';

    RETURN text_value;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao extrair texto da resposta: %', SQLERRM;
END;
$function$;