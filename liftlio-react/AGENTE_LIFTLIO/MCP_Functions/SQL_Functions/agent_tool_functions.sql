-- Funções específicas para cada tool do agente v61
-- Todas otimizadas para respostas concisas

-- 1. DAILY BRIEFING - Resumo executivo do dia
CREATE OR REPLACE FUNCTION get_daily_briefing(p_project_id int)
RETURNS TABLE (
  metric_name text,
  value text,
  trend text,
  priority int
) AS $$
BEGIN
  RETURN QUERY
  WITH today_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE date_trunc('day', created_at) = CURRENT_DATE) as posts_today,
      COUNT(*) FILTER (WHERE date_trunc('day', created_at) = CURRENT_DATE - INTERVAL '1 day') as posts_yesterday,
      COUNT(*) FILTER (WHERE status = 'scheduled' AND scheduled_for > now()) as scheduled_future,
      COUNT(DISTINCT channel_id) as active_channels
    FROM postagens
    WHERE project_id = p_project_id
  ),
  engagement_stats AS (
    SELECT 
      COALESCE(AVG(views), 0)::int as avg_views,
      COALESCE(AVG(engagement_rate), 0)::numeric(5,2) as avg_engagement
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    WHERE c.project_id = p_project_id
    AND v.created_at > CURRENT_DATE - INTERVAL '7 days'
  )
  SELECT * FROM (
    SELECT 
      'Posts hoje' as metric_name,
      posts_today::text as value,
      CASE 
        WHEN posts_today > posts_yesterday THEN '↑'
        WHEN posts_today < posts_yesterday THEN '↓'
        ELSE '→'
      END as trend,
      1 as priority
    FROM today_stats
    
    UNION ALL
    
    SELECT 
      'Agendados' as metric_name,
      scheduled_future::text as value,
      '📅' as trend,
      2 as priority
    FROM today_stats
    
    UNION ALL
    
    SELECT 
      'Canais ativos' as metric_name,
      active_channels::text as value,
      '📺' as trend,
      3 as priority
    FROM today_stats
    
    UNION ALL
    
    SELECT 
      'Engajamento médio' as metric_name,
      avg_engagement || '%' as value,
      CASE 
        WHEN avg_engagement > 5 THEN '🔥'
        WHEN avg_engagement > 2 THEN '✨'
        ELSE '📊'
      END as trend,
      4 as priority
    FROM engagement_stats
  ) metrics
  ORDER BY priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PROJECT QUICK STATUS - Status rápido do projeto
CREATE OR REPLACE FUNCTION get_project_quick_status(p_project_id int)
RETURNS TABLE (
  status_type text,
  status_value text,
  status_icon text
) AS $$
BEGIN
  RETURN QUERY
  WITH project_data AS (
    SELECT 
      p.name as project_name,
      COUNT(DISTINCT c.id) as total_channels,
      COUNT(DISTINCT v.id) as total_videos,
      COUNT(DISTINCT po.id) as total_posts,
      COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'posted') as posted_count,
      COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'scheduled') as scheduled_count
    FROM projects p
    LEFT JOIN channels c ON c.project_id = p.id
    LEFT JOIN videos v ON v.channel_id = c.id
    LEFT JOIN postagens po ON po.project_id = p.id
    WHERE p.id = p_project_id
    GROUP BY p.id, p.name
  )
  SELECT 
    'Projeto' as status_type,
    project_name as status_value,
    '🎯' as status_icon
  FROM project_data
  
  UNION ALL
  
  SELECT 
    'Status' as status_type,
    CASE 
      WHEN posted_count > 0 OR scheduled_count > 0 THEN 'Ativo'
      ELSE 'Configurando'
    END as status_value,
    CASE 
      WHEN posted_count > 0 OR scheduled_count > 0 THEN '✅'
      ELSE '⚙️'
    END as status_icon
  FROM project_data
  
  UNION ALL
  
  SELECT 
    'Cobertura' as status_type,
    total_channels || ' canais, ' || total_videos || ' vídeos' as status_value,
    '📊' as status_icon
  FROM project_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. GET ALL CHANNELS STATS - Lista canais com estatísticas
CREATE OR REPLACE FUNCTION get_all_channels_stats(
  p_project_id int,
  p_limit int DEFAULT NULL
)
RETURNS TABLE (
  channel_name text,
  subscriber_count text,
  video_count int,
  avg_views text,
  last_post text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.name as channel_name,
    CASE 
      WHEN c.subscriber_count >= 1000000 THEN (c.subscriber_count / 1000000.0)::numeric(5,1) || 'M'
      WHEN c.subscriber_count >= 1000 THEN (c.subscriber_count / 1000.0)::numeric(5,1) || 'K'
      ELSE c.subscriber_count::text
    END as subscriber_count,
    COUNT(DISTINCT v.id)::int as video_count,
    CASE 
      WHEN AVG(v.views) >= 1000000 THEN (AVG(v.views) / 1000000.0)::numeric(5,1) || 'M'
      WHEN AVG(v.views) >= 1000 THEN (AVG(v.views) / 1000.0)::numeric(5,1) || 'K'
      ELSE COALESCE(AVG(v.views), 0)::int::text
    END as avg_views,
    COALESCE(
      to_char(MAX(p.created_at), 'DD/MM HH24h'),
      'Sem posts'
    ) as last_post
  FROM channels c
  LEFT JOIN videos v ON v.channel_id = c.id
  LEFT JOIN postagens p ON p.video_id = v.id
  WHERE c.project_id = p_project_id
  GROUP BY c.id, c.name, c.subscriber_count
  ORDER BY c.subscriber_count DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. GET POSTS BY DATE - Posts de uma data específica
CREATE OR REPLACE FUNCTION get_posts_by_date(
  p_project_id int,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  post_time text,
  post_status text,
  post_content text,
  video_title text,
  channel_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(
      COALESCE(p.scheduled_for, p.created_at), 
      'HH24:MI'
    ) as post_time,
    CASE p.status
      WHEN 'posted' THEN '✅'
      WHEN 'scheduled' THEN '📅'
      ELSE '⏳'
    END as post_status,
    LEFT(p.content, 100) || 
    CASE WHEN length(p.content) > 100 THEN '...' ELSE '' END as post_content,
    LEFT(v.title, 50) || 
    CASE WHEN length(v.title) > 50 THEN '...' ELSE '' END as video_title,
    c.name as channel_name
  FROM postagens p
  JOIN videos v ON p.video_id = v.id
  JOIN channels c ON v.channel_id = c.id
  WHERE p.project_id = p_project_id
  AND date_trunc('day', COALESCE(p.scheduled_for, p.created_at)) = p_date
  ORDER BY COALESCE(p.scheduled_for, p.created_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. GET SCHEDULED POSTS - Posts agendados futuros
CREATE OR REPLACE FUNCTION get_scheduled_posts(
  p_project_id int,
  p_days_ahead int DEFAULT 7
)
RETURNS TABLE (
  scheduled_date text,
  scheduled_time text,
  post_preview text,
  video_info text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    to_char(p.scheduled_for, 'DD/MM') as scheduled_date,
    to_char(p.scheduled_for, 'HH24:MI') as scheduled_time,
    LEFT(p.content, 80) || '...' as post_preview,
    c.name || ': ' || LEFT(v.title, 40) as video_info
  FROM postagens p
  JOIN videos v ON p.video_id = v.id
  JOIN channels c ON v.channel_id = c.id
  WHERE p.project_id = p_project_id
  AND p.status = 'scheduled'
  AND p.scheduled_for > now()
  AND p.scheduled_for <= now() + INTERVAL '1 day' * p_days_ahead
  ORDER BY p.scheduled_for
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. ANALYZE CHANNEL PERFORMANCE - Análise de performance
CREATE OR REPLACE FUNCTION analyze_channel_performance(
  p_project_id int,
  p_days int DEFAULT 7
)
RETURNS TABLE (
  metric text,
  value text,
  insight text
) AS $$
BEGIN
  RETURN QUERY
  WITH performance_data AS (
    SELECT 
      COUNT(DISTINCT p.id) as total_posts,
      COUNT(DISTINCT p.id) FILTER (WHERE p.created_at > now() - INTERVAL '1 day' * p_days) as recent_posts,
      COUNT(DISTINCT c.id) as active_channels,
      AVG(v.views)::int as avg_views,
      MAX(v.views)::int as max_views,
      COUNT(DISTINCT date_trunc('day', p.created_at)) as active_days
    FROM channels c
    JOIN videos v ON v.channel_id = c.id
    LEFT JOIN postagens p ON p.video_id = v.id
    WHERE c.project_id = p_project_id
    AND p.created_at > now() - INTERVAL '1 day' * p_days
  )
  SELECT 
    'Frequência de posts' as metric,
    ROUND(recent_posts::numeric / NULLIF(active_days, 0), 1)::text || ' por dia' as value,
    CASE 
      WHEN recent_posts::numeric / NULLIF(active_days, 0) > 5 THEN 'Excelente ritmo!'
      WHEN recent_posts::numeric / NULLIF(active_days, 0) > 2 THEN 'Bom ritmo'
      ELSE 'Pode aumentar frequência'
    END as insight
  FROM performance_data
  
  UNION ALL
  
  SELECT 
    'Alcance médio' as metric,
    CASE 
      WHEN avg_views >= 1000 THEN (avg_views / 1000.0)::numeric(5,1) || 'K views'
      ELSE avg_views::text || ' views'
    END as value,
    CASE 
      WHEN avg_views > 10000 THEN 'Alcance excelente!'
      WHEN avg_views > 1000 THEN 'Bom alcance'
      ELSE 'Oportunidade de crescimento'
    END as insight
  FROM performance_data
  
  UNION ALL
  
  SELECT 
    'Melhor vídeo' as metric,
    CASE 
      WHEN max_views >= 1000 THEN (max_views / 1000.0)::numeric(5,1) || 'K views'
      ELSE max_views::text || ' views'
    END as value,
    'Seu conteúdo de maior sucesso' as insight
  FROM performance_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. GET ENGAGEMENT METRICS - Métricas de engajamento
CREATE OR REPLACE FUNCTION get_engagement_metrics(p_project_id int)
RETURNS TABLE (
  engagement_type text,
  total_count bigint,
  percentage text,
  emoji text
) AS $$
BEGIN
  RETURN QUERY
  WITH engagement_data AS (
    SELECT 
      SUM(v.likes) as total_likes,
      SUM(v.comments) as total_comments,
      SUM(v.views) as total_views,
      COUNT(DISTINCT p.id) as total_posts
    FROM videos v
    JOIN channels c ON v.channel_id = c.id
    LEFT JOIN postagens p ON p.video_id = v.id
    WHERE c.project_id = p_project_id
  )
  SELECT 
    'Visualizações' as engagement_type,
    COALESCE(total_views, 0) as total_count,
    '100%' as percentage,
    '👁️' as emoji
  FROM engagement_data
  
  UNION ALL
  
  SELECT 
    'Curtidas' as engagement_type,
    COALESCE(total_likes, 0) as total_count,
    CASE 
      WHEN total_views > 0 THEN 
        ROUND((total_likes::numeric / total_views) * 100, 1)::text || '%'
      ELSE '0%'
    END as percentage,
    '❤️' as emoji
  FROM engagement_data
  
  UNION ALL
  
  SELECT 
    'Comentários' as engagement_type,
    COALESCE(total_comments, 0) as total_count,
    CASE 
      WHEN total_views > 0 THEN 
        ROUND((total_comments::numeric / total_views) * 100, 2)::text || '%'
      ELSE '0%'
    END as percentage,
    '💬' as emoji
  FROM engagement_data
  
  UNION ALL
  
  SELECT 
    'Posts realizados' as engagement_type,
    COALESCE(total_posts, 0) as total_count,
    '-' as percentage,
    '📝' as emoji
  FROM engagement_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função helper para formatar números grandes
CREATE OR REPLACE FUNCTION format_large_number(num bigint)
RETURNS text AS $$
BEGIN
  CASE
    WHEN num >= 1000000000 THEN RETURN (num / 1000000000.0)::numeric(5,1) || 'B';
    WHEN num >= 1000000 THEN RETURN (num / 1000000.0)::numeric(5,1) || 'M';
    WHEN num >= 1000 THEN RETURN (num / 1000.0)::numeric(5,1) || 'K';
    ELSE RETURN num::text;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;