-- =============================================
-- Funcao: get_blog_admin_stats
-- Descricao: Retorna estatisticas do blog para o painel admin
-- Criado: 2025-12-28
-- Atualizado: 2026-01-05 - Simplificado! Removido CRON, calcula direto das tabelas
-- =============================================

CREATE OR REPLACE FUNCTION public.get_blog_admin_stats()
RETURNS TABLE(
  total_posts bigint,
  published_posts bigint,
  draft_posts bigint,
  scheduled_posts bigint,
  total_views bigint,
  total_likes bigint,
  total_comments bigint,
  total_subscribers bigint,
  posts_this_month bigint,
  views_this_month bigint,
  views_today bigint,
  likes_today bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    -- Contadores de posts
    (SELECT COUNT(*) FROM blog_posts)::BIGINT AS total_posts,
    (SELECT COUNT(*) FROM blog_posts WHERE status = 'published')::BIGINT AS published_posts,
    (SELECT COUNT(*) FROM blog_posts WHERE status = 'draft')::BIGINT AS draft_posts,
    (SELECT COUNT(*) FROM blog_posts WHERE status = 'scheduled')::BIGINT AS scheduled_posts,

    -- Totais agregados
    (SELECT COALESCE(SUM(view_count), 0) FROM blog_posts)::BIGINT AS total_views,
    (SELECT COALESCE(SUM(like_count), 0) FROM blog_posts)::BIGINT AS total_likes,
    (SELECT COALESCE(SUM(comment_count), 0) FROM blog_posts)::BIGINT AS total_comments,
    (SELECT COUNT(*) FROM blog_subscribers WHERE status = 'active')::BIGINT AS total_subscribers,

    -- Este mes
    (SELECT COUNT(*) FROM blog_posts WHERE created_at >= date_trunc('month', NOW()))::BIGINT AS posts_this_month,
    (SELECT COUNT(*) FROM blog_views WHERE created_at >= date_trunc('month', NOW()))::BIGINT AS views_this_month,

    -- HOJE - Calculo DIRETO das tabelas (sem CRON!)
    -- Muito mais simples que a versao anterior com view_count_start_of_day
    (SELECT COUNT(*) FROM blog_views WHERE created_at >= CURRENT_DATE)::BIGINT AS views_today,
    (SELECT COUNT(*) FROM blog_likes WHERE created_at >= CURRENT_DATE)::BIGINT AS likes_today;
END;
$function$;

-- =============================================
-- NOTAS:
--
-- Versao anterior (overengineering):
--   - Usava CRON `reset-blog-daily-counters` para resetar contadores a meia-noite
--   - Colunas view_count_start_of_day e like_count_start_of_day na blog_posts
--   - Calculava: view_count - view_count_start_of_day
--
-- Versao atual (simplificada):
--   - Calcula direto: COUNT(*) FROM blog_views WHERE created_at >= CURRENT_DATE
--   - Sem CRON, sem colunas auxiliares
--   - Dados sempre precisos
-- =============================================
