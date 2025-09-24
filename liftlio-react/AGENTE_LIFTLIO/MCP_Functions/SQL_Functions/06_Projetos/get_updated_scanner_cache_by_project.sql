-- =============================================
-- Função: get_updated_scanner_cache_by_project
-- Descrição: Retorna cache de scanners com texto de teste para um projeto
-- Criado: 2025-01-24
-- Atualizado: Adiciona 'TESTE' ao cache existente
-- =============================================

CREATE OR REPLACE FUNCTION public.get_updated_scanner_cache_by_project(project_id bigint)
 RETURNS TABLE(id bigint, "ID cache videos" character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT s.id, COALESCE(s."ID cache videos", '') || 'TESTE' AS "ID cache videos"
  FROM public."Scanner de videos do youtube" s
  WHERE s."Projeto_id" = project_id;
END;
$function$
