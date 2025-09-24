-- =============================================
-- Função: column_exists
-- Descrição: Verifica se uma coluna existe em uma tabela
-- Criado: 2025-01-24
-- Atualizado: Função utilitária para verificar existência de coluna
-- =============================================

CREATE OR REPLACE FUNCTION public.column_exists(tbl text, col text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = tbl AND column_name = col
  );
END;
$function$