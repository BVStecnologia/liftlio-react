-- =============================================
-- Função: get_projeto_data
-- Descrição: Retorna dados do projeto incluindo IDs negativos combinados
-- Criado: 2025-01-24
-- Atualizado: Combina cache e IDs verificados para exclusão
-- =============================================

CREATE OR REPLACE FUNCTION public.get_projeto_data(scanner_id bigint)
 RETURNS TABLE(descricao_projeto text, pais text, palavras_negativas text, ids_negativos text, palavra_chave text, projeto_id bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    p_projeto_id bigint;
    cache_ids text;
    verificado_ids text;
    combined_ids text;
BEGIN
    -- Primeiro obtém o projeto_id para o scanner especificado
    SELECT "Projeto_id" INTO p_projeto_id
    FROM public."Scanner de videos do youtube"
    WHERE id = scanner_id;
    
    IF p_projeto_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Obtém todos os IDs cache de vídeos do mesmo projeto
    SELECT 
        string_agg("ID cache videos", ',')
    INTO 
        cache_ids
    FROM 
        public."Scanner de videos do youtube"
    WHERE 
        "Projeto_id" = p_projeto_id 
        AND "ID cache videos" IS NOT NULL 
        AND "ID cache videos" <> '';
    
    -- Obtém todos os IDs verificados do mesmo projeto
    SELECT 
        string_agg("ID Verificado", ',')
    INTO 
        verificado_ids
    FROM 
        public."Scanner de videos do youtube"
    WHERE 
        "Projeto_id" = p_projeto_id 
        AND "ID Verificado" IS NOT NULL 
        AND "ID Verificado" <> '';
    
    -- Combina os dois conjuntos de IDs
    IF cache_ids IS NOT NULL AND verificado_ids IS NOT NULL THEN
        combined_ids := cache_ids || ',' || verificado_ids;
    ELSIF cache_ids IS NOT NULL THEN
        combined_ids := cache_ids;
    ELSE
        combined_ids := verificado_ids;
    END IF;
    
    -- Agora retorna todos os dados solicitados, incluindo IDs negativos combinados
    RETURN QUERY
    SELECT 
        p."description service"::text,
        p."País"::text,
        p."Negative keywords"::text,
        combined_ids,
        s."Keyword"::text,
        s."Projeto_id"
    FROM 
        public."Scanner de videos do youtube" s
    JOIN 
        public."Projeto" p ON s."Projeto_id" = p.id
    WHERE 
        s.id = scanner_id;
END;
$function$
