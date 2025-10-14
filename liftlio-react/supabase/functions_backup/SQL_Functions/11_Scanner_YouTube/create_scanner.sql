-- =============================================
-- Função: create_scanner
-- Descrição: Cria um novo scanner de vídeos do YouTube
-- Criado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS public.create_scanner(text, bigint);

CREATE OR REPLACE FUNCTION public.create_scanner(keyword text, project_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  scanner_exists BOOLEAN;
BEGIN
  -- Verifica se já existe um scanner com a mesma palavra-chave e projeto
  SELECT EXISTS (
    SELECT 1 FROM "Scanner de videos do youtube"
    WHERE "Keyword" = keyword AND "Projeto_id" = project_id
  ) INTO scanner_exists;

  -- Se não existir um scanner com a mesma palavra-chave e projeto, insere um novo
  IF NOT scanner_exists THEN
    INSERT INTO "Scanner de videos do youtube" ("Keyword", "Ativa?", "Projeto_id")
    VALUES (keyword, true, project_id);
  END IF;
END;
$function$;