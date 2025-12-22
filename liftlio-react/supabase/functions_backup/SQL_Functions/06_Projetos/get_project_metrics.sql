-- =============================================
-- Funcao: get_project_metrics
-- Descricao: Obtem metricas do projeto para cards do Monitoring
-- Criado: 2024-01-24
-- Atualizado: 2025-12-21 - Filtro ANTI-SPAM em todos os cards (exclui canais bloqueados)
-- =============================================

-- Versao INTEGER (usada pelo frontend)
DROP FUNCTION IF EXISTS public.get_project_metrics(integer);

CREATE OR REPLACE FUNCTION public.get_project_metrics(p_project_id integer)
RETURNS TABLE(total_channels integer, total_videos integer, posts integer, videos_today integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        -- CARD 1: CHANNELS (Canais Ativos) - COM FILTRO ANTI-SPAM
        (
            SELECT COUNT(*)::INTEGER
            FROM "Canais do youtube" c
            WHERE c."Projeto" = p_project_id
              AND (c.is_active = true OR c.is_active IS NULL)
              AND c.auto_disabled_reason IS NULL
              AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
        ) as total_channels,

        -- CARD 2: ANALYZED (Videos Analisados) - COM FILTRO ANTI-SPAM
        (
            SELECT COUNT(DISTINCT elem->>'id')::INTEGER
            FROM "Canais do youtube" c,
                 LATERAL jsonb_array_elements(
                     CASE
                         WHEN c.videos_scanreados IS NULL
                              OR c.videos_scanreados = ''
                              OR c.videos_scanreados::text NOT LIKE '[%'
                         THEN '[]'::jsonb
                         ELSE c.videos_scanreados::jsonb
                     END
                 ) elem
            WHERE c."Projeto" = p_project_id
              AND c.videos_scanreados IS NOT NULL
              AND c.videos_scanreados != ''
              AND (c.is_active = true OR c.is_active IS NULL)
              AND c.auto_disabled_reason IS NULL
              AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
        ) as total_videos,

        -- CARD 3: APPROVED (Videos Aprovados COM mensagens postadas) - COM FILTRO ANTI-SPAM
        (
            SELECT COUNT(DISTINCT elem->>'id')::INTEGER
            FROM "Canais do youtube" c,
                 LATERAL jsonb_array_elements(
                     CASE
                         WHEN c.videos_scanreados IS NULL
                              OR c.videos_scanreados = ''
                              OR c.videos_scanreados::text NOT LIKE '[%'
                         THEN '[]'::jsonb
                         ELSE c.videos_scanreados::jsonb
                     END
                 ) elem
            WHERE c."Projeto" = p_project_id
              AND elem->>'status' = 'APPROVED'
              AND (c.is_active = true OR c.is_active IS NULL)
              AND c.auto_disabled_reason IS NULL
              AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
              AND EXISTS (
                  SELECT 1
                  FROM "Videos" v
                  INNER JOIN "Mensagens" m ON m.video = v.id
                  WHERE v."VIDEO" = (elem->>'id')
              )
        ) as posts,

        -- CARD 4: TODAY (Videos Analisados Hoje) - COM FILTRO ANTI-SPAM
        (
            SELECT COUNT(DISTINCT elem->>'id')::INTEGER
            FROM "Canais do youtube" c,
                 LATERAL jsonb_array_elements(
                     CASE
                         WHEN c.videos_scanreados IS NULL
                              OR c.videos_scanreados = ''
                              OR c.videos_scanreados::text NOT LIKE '[%'
                         THEN '[]'::jsonb
                         ELSE c.videos_scanreados::jsonb
                     END
                 ) elem
            WHERE c."Projeto" = p_project_id
              AND (c.is_active = true OR c.is_active IS NULL)
              AND c.auto_disabled_reason IS NULL
              AND (c.desativado_pelo_user = false OR c.desativado_pelo_user IS NULL)
              AND (
                  (elem->>'analyzed_at' IS NOT NULL
                   AND (elem->>'analyzed_at')::timestamptz >= CURRENT_DATE::timestamptz)
                  OR
                  (elem->>'analyzed_at' IS NULL
                   AND c.last_canal_check >= CURRENT_DATE::timestamptz)
              )
        ) as videos_today;
END;
$function$;

-- Versao BIGINT (alternativa)
DROP FUNCTION IF EXISTS public.get_project_metrics(bigint);

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
      -- FILTRO ANTI-SPAM
      AND (is_active = true OR is_active IS NULL)
      AND auto_disabled_reason IS NULL
      AND (desativado_pelo_user = false OR desativado_pelo_user IS NULL)
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
$function$;
