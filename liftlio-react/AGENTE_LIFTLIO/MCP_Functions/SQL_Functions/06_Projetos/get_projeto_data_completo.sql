-- =============================================
-- Função: get_projeto_data_completo
-- Descrição: Retorna dados completos do projeto por scanner ID
-- Criado: 2025-01-24
-- Atualizado: JSON com informações completas do projeto
-- =============================================

CREATE OR REPLACE FUNCTION public.get_projeto_data_completo(scanner_id bigint)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'scanner_id', s.id,
        'palavra_chave', COALESCE(s."Keyword", ''),
        'projeto_id', s."Projeto_id",
        'nome_empresa', COALESCE(p."Project name", ''),
        'descricao_projeto', COALESCE(p."description service", ''),
        'regiao', COALESCE(p."País", 'BR'),
        'videos_excluidos', COALESCE(s."ID cache videos", '')
    ) INTO result
    FROM public."Scanner de videos do youtube" s
    LEFT JOIN public."Projeto" p ON s."Projeto_id" = p.id
    WHERE s.id = scanner_id;
    
    RETURN result;
END;
$function$
