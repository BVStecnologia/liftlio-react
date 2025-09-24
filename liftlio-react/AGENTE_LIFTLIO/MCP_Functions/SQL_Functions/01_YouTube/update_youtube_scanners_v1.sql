-- =============================================
-- Função: update_youtube_scanners (versão 1 - apenas project_id)
-- Descrição: Atualiza scanners do YouTube baseado nas palavras-chave do projeto
-- Parâmetros: project_id bigint
-- Criado: 2025-01-23
-- =============================================

CREATE OR REPLACE FUNCTION public.update_youtube_scanners(project_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    keyword_record RECORD;
BEGIN
    -- Primeiro, vamos buscar todas as palavras-chave do projeto
    FOR keyword_record IN
        SELECT DISTINCT keyword
        FROM "Palavras-chave do Projeto"
        WHERE "Projeto_id" = project_id
    LOOP
        -- Verificar se já existe um scanner para esta palavra-chave
        IF NOT EXISTS (
            SELECT 1
            FROM "Scanner de videos do youtube"
            WHERE "Projeto_id" = project_id AND "Keyword" = keyword_record.keyword
        ) THEN
            -- Se não existir, criar um novo scanner
            INSERT INTO "Scanner de videos do youtube"
            (id, "Projeto_id", "Keyword", "Ativa?")
            VALUES (
                (SELECT COALESCE(MAX(id), 0) + 1 FROM "Scanner de videos do youtube"),
                project_id,
                keyword_record.keyword,
                true
            );
        END IF;
    END LOOP;

    -- Opcionalmente, desativar scanners para palavras-chave que não existem mais
    UPDATE "Scanner de videos do youtube"
    SET "Ativa?" = false
    WHERE "Projeto_id" = project_id
    AND "Keyword" NOT IN (
        SELECT keyword
        FROM "Palavras-chave do Projeto"
        WHERE "Projeto_id" = project_id
    );
END;
$function$