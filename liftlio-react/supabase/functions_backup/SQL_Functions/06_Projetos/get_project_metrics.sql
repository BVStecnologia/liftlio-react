-- =============================================
-- Função: get_project_metrics
-- Descrição: Obtém métricas detalhadas de um projeto incluindo views, likes, posts e canais
-- Criado: 2024-01-24
-- Atualizado: -
-- =============================================

CREATE OR REPLACE FUNCTION public.get_project_metrics(id_projeto bigint)
 RETURNS TABLE(total_views bigint, total_likes bigint, media numeric, posts bigint, total_channels bigint, total_videos bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH canal_ids AS (
    SELECT
      channel_id
    FROM
      public."Canais do youtube"
    WHERE
      "Projeto" = id_projeto
  )
  SELECT
    SUM(v.view_count)::bigint AS total_views,
    SUM(v.like_count)::bigint AS total_likes,
    CAST((AVG(v.relevance_score) * 10) AS numeric(10,2)) AS media,
    (SELECT COUNT(*)::bigint FROM public."Mensagens" m WHERE m.respondido = true
     AND m.project_id = id_projeto)::bigint AS posts,
    (SELECT COUNT(*)::bigint FROM canal_ids) AS total_channels,
    COUNT(DISTINCT v.id)::bigint AS total_videos
  FROM
    public."Videos" v
  WHERE
    v.channel_id_yotube IN (SELECT channel_id FROM canal_ids);
END;
$function$