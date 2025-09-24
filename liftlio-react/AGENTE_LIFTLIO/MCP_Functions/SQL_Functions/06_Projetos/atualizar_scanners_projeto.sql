-- =============================================
-- Função: atualizar_scanners_projeto
-- Descrição: Atualiza scanners de vídeos do YouTube para um projeto
-- Criado: 2025-01-24
-- Atualizado: Função para atualizar cache de vídeos dos scanners
-- =============================================

CREATE OR REPLACE FUNCTION public.atualizar_scanners_projeto(p_projeto_id bigint)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  scanner_rec record;
  result_text text := '';
BEGIN
  FOR scanner_rec IN SELECT * FROM "Scanner de videos do youtube" WHERE "Projeto_id" = p_projeto_id
  LOOP
    result_text := result_text || format('Processando scanner com ID: %, Keyword: %', scanner_rec.id, scanner_rec."Keyword") || chr(10);

    -- Atualizar o campo "ID cache videos" com um texto de teste
    UPDATE "Scanner de videos do youtube"
    SET "ID cache videos" = COALESCE("ID cache videos", '') ||
                            CASE
                              WHEN "ID cache videos" IS NULL OR "ID cache videos" = ''
                              THEN 'TESTE_' || scanner_rec.id
                              ELSE ',TESTE_' || scanner_rec.id
                            END
    WHERE id = scanner_rec.id;

    result_text := result_text || format('Texto de teste adicionado para o scanner com ID: %', scanner_rec.id) || chr(10);
  END LOOP;

  RETURN result_text;
END;
$function$