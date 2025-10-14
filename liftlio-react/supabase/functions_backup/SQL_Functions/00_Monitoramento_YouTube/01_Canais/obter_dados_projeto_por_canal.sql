-- =============================================
-- Função: obter_dados_projeto_por_canal
-- Descrição: Obtém dados do projeto através do canal
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS obter_dados_projeto_por_canal(BIGINT);

CREATE OR REPLACE FUNCTION obter_dados_projeto_por_canal(canal_id bigint)
RETURNS TABLE(
    descricao_servico text,
    nome_produto_servico text,
    pais text
)
LANGUAGE plpgsql
AS $$
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
$$;