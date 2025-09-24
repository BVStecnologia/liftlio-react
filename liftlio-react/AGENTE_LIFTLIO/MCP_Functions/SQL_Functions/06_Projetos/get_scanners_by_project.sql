-- =============================================
-- Função: get_scanners_by_project
-- Descrição: Retorna scanners associados a um projeto
-- Criado: 2025-01-24
-- Atualizado: Lista scanners com keywords e status ativo
-- =============================================

CREATE OR REPLACE FUNCTION public.get_scanners_by_project(project_id_param bigint)
 RETURNS TABLE(scanner_id bigint, keyword character varying, is_active boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        id AS scanner_id,
        "Keyword" AS keyword,
        "Ativa?" AS is_active
    FROM 
        public."Scanner de videos do youtube"
    WHERE 
        "Projeto_id" = project_id_param
    ORDER BY 
        id;
END;
$function$
