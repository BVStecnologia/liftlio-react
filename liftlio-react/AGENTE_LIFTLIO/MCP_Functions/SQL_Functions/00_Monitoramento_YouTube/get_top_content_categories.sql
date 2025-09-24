-- =============================================
-- Função: get_top_content_categories
-- Descrição: Obtém as principais categorias de conteúdo de um projeto
-- Criado: 2025-01-23
-- Atualizado: 2025-01-23
-- =============================================

DROP FUNCTION IF EXISTS get_top_content_categories(BIGINT);

CREATE OR REPLACE FUNCTION get_top_content_categories(id_projeto bigint)
RETURNS TABLE(
    content_category text,
    total_videos bigint,
    total_views text,
    total_likes text,
    media_relevancia numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH project_videos AS (
    SELECT
      v.id,
      v.content_category,
      v.view_count,
      v.like_count,
      v.relevance_score
    FROM
      public."Videos" v
    WHERE
      -- Videos relacionados através dos canais do projeto
      v.canal IN (
        SELECT id
        FROM public."Canais do youtube"
        WHERE "Projeto" = id_projeto
      )
      -- Ou videos relacionados através do scanner do projeto
      OR v.scanner_id IN (
        SELECT id
        FROM public."Scanner de videos do youtube"
        WHERE "Projeto_id" = id_projeto
      )
      AND v.content_category IS NOT NULL
  )
  SELECT
    pv.content_category,
    COUNT(*)::bigint AS total_videos,
    -- Formatar total de visualizações como texto
    CASE
      WHEN SUM(pv.view_count) IS NULL THEN '0'
      ELSE SUM(pv.view_count)::text
    END AS total_views,
    -- Formatar total de curtidas como texto
    CASE
      WHEN SUM(pv.like_count) IS NULL THEN '0'
      ELSE SUM(pv.like_count)::text
    END AS total_likes,
    -- Calcular e formatar a média de relevância
    CAST(AVG(pv.relevance_score * 10) AS numeric(10,2)) AS media_relevancia
  FROM
    project_videos pv
  GROUP BY
    pv.content_category
  ORDER BY
    total_videos DESC,
    SUM(pv.view_count) DESC
  LIMIT 5;
END;
$$;