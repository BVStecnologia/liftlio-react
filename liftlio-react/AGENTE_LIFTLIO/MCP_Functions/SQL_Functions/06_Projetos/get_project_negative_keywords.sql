-- =============================================
-- Função: get_project_negative_keywords
-- Descrição: Retorna array de palavras-chave negativas do projeto
-- Criado: 2025-01-24
-- Atualizado: Processa e limpa keywords negativas
-- =============================================

CREATE OR REPLACE FUNCTION public.get_project_negative_keywords(project_id bigint)
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    negative_keywords TEXT[];
BEGIN
    SELECT string_to_array(TRIM(COALESCE("Negative keywords", '')), ',')
    INTO negative_keywords
    FROM public."Projeto"
    WHERE id = project_id;
    
    -- Remove espaços em branco de cada palavra
    SELECT array_agg(TRIM(keyword))
    INTO negative_keywords
    FROM unnest(negative_keywords) keyword
    WHERE TRIM(keyword) <> '';

    RETURN negative_keywords;
END;
$function$
