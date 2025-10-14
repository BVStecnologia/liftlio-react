-- =============================================
-- Função: update_youtube_scanners (versão 2 - com array de keywords)
-- Descrição: Atualiza scanners do YouTube com array de palavras-chave
-- Parâmetros: project_id bigint, keywords text[]
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.update_youtube_scanners(project_id bigint, keywords text[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    keyword text;
BEGIN
    -- Para cada palavra-chave fornecida
    FOREACH keyword IN ARRAY keywords
    LOOP
        -- Verificar se já existe um scanner para esta palavra-chave
        IF NOT EXISTS (
            SELECT 1
            FROM "Scanner de videos do youtube"
            WHERE "Projeto_id" = project_id AND "Keyword" = keyword
        ) THEN
            -- Se não existir, criar um novo scanner
            INSERT INTO "Scanner de videos do youtube"
            (id, "Projeto_id", "Keyword", "Ativa?")
            VALUES (
                (SELECT COALESCE(MAX(id), 0) + 1 FROM "Scanner de videos do youtube"),
                project_id,
                keyword,
                true
            );
        END IF;
    END LOOP;

    -- Desativar scanners para palavras-chave que não estão na lista fornecida
    UPDATE "Scanner de videos do youtube"
    SET "Ativa?" = false
    WHERE "Projeto_id" = project_id
    AND "Keyword" NOT IN (SELECT unnest(keywords));
END;
$function$