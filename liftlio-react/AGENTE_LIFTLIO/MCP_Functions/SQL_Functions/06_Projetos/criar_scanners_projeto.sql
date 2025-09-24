-- =============================================
-- Função: criar_scanners_projeto
-- Descrição: Trigger para criar scanners quando projeto é inserido
-- Criado: 2025-01-24
-- Atualizado: Cria scanners automaticamente para novas palavras-chave
-- =============================================

CREATE OR REPLACE FUNCTION public.criar_scanners_projeto()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  keywords text[];
  keyword text;
BEGIN
  -- Obtém as palavras-chave do novo projeto inserido
  SELECT string_to_array(NEW."Keywords", ',') INTO keywords;

  -- Itera sobre cada palavra-chave
  FOREACH keyword IN ARRAY keywords
  LOOP
    -- Verifica se já existe um scanner para a palavra-chave atual
    IF NOT EXISTS (
      SELECT 1 FROM "Scanner de videos do youtube"
      WHERE "Keyword" = trim(keyword) AND "Projeto_id" = NEW.id
    ) THEN
      -- Cria um novo scanner para a palavra-chave
      INSERT INTO "Scanner de videos do youtube" ("Keyword", "Ativa?", "Projeto_id")
      VALUES (trim(keyword), true, NEW.id);
    END IF;
  END LOOP;

  RETURN NEW;
END;
$function$