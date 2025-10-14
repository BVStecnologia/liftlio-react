-- =============================================
-- Função: obter_dados_projeto_por_canal
-- Descrição: Obtém dados do projeto por canal
-- Criado: 2025-01-24
-- Atualizado: Função para buscar dados do projeto através do canal
-- =============================================

CREATE OR REPLACE FUNCTION public.obter_dados_projeto_por_canal(canal_id bigint)
 RETURNS TABLE(descricao_servico text, nome_produto_servico text, pais text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p."description service" AS descricao_servico,
        p."Project name" AS nome_produto_servico,
        p."País" AS pais
    FROM
        public."Canais do youtube" c
    INNER JOIN
        public."Projeto" p ON c."Projeto" = p.id
    WHERE
        c.id = canal_id;
END;
$function$