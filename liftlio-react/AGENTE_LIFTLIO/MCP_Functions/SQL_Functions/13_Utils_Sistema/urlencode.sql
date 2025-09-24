-- =============================================
-- Função: urlencode
-- Descrição: Codifica uma string para formato URL
-- Criado: 2025-01-24
-- Atualizado: Função utilitária para codificação URL
-- =============================================

CREATE OR REPLACE FUNCTION public.urlencode(data text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE
  result text;
BEGIN
  SELECT string_agg(
    CASE WHEN char !~ '[a-zA-Z0-9]' THEN
      '%' || encode(char::bytea, 'hex')
    ELSE
      char
    END, ''
  ) INTO result
  FROM regexp_split_to_table(data, '') AS char;
  RETURN result;
END;
$function$