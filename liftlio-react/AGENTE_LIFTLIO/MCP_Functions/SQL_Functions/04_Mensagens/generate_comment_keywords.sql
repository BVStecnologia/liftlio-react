-- =============================================
-- Função: generate_comment_keywords
-- Descrição: Gera palavras-chave de intenção de compra usando Claude AI
-- Criado: 2025-01-25
-- Atualizado: 2025-01-26 - Versão simplificada que funciona com claude_complete
-- =============================================

DROP FUNCTION IF EXISTS generate_comment_keywords(integer);

CREATE OR REPLACE FUNCTION public.generate_comment_keywords(p_project_id integer)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    v_project_name text;
    v_project_description text;
    v_project_country text;
    v_existing_keywords text;
    v_language text;
    v_prompt text;
    v_response text;
BEGIN
    -- Verificar se já existe
    SELECT palavras_chaves_p_comments
    INTO v_existing_keywords
    FROM "Projeto"
    WHERE id = p_project_id;

    IF v_existing_keywords IS NOT NULL AND v_existing_keywords != '' THEN
        RETURN v_existing_keywords;
    END IF;

    -- Buscar dados do projeto
    SELECT
        "Project name",
        COALESCE("description service", ''),
        "País"
    INTO
        v_project_name,
        v_project_description,
        v_project_country
    FROM "Projeto"
    WHERE id = p_project_id;

    -- Mapear idioma
    v_language := CASE v_project_country
        WHEN 'BR' THEN 'portuguese'
        WHEN 'US' THEN 'english'
        ELSE 'english'
    END;

    -- Prompt simples e direto
    v_prompt := format(
        'Generate 20 purchase intent keywords for YouTube comments about %s (%s). Language: %s. Return only comma-separated keywords.',
        v_project_name,
        substring(v_project_description, 1, 200),
        v_language
    );

    -- Chamar Claude
    v_response := claude_complete(
        v_prompt,
        'You are a keyword generator. Return only keywords.',
        500,
        0.3,
        30000
    );

    -- Salvar se obteve resposta
    IF v_response IS NOT NULL THEN
        UPDATE "Projeto"
        SET palavras_chaves_p_comments = v_response
        WHERE id = p_project_id;
    END IF;

    RETURN v_response;
END;
$function$;