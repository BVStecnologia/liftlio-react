-- Funções mock simplificadas para o agente v62
-- Criadas para demonstrar funcionamento sem precisar de tabelas complexas

-- Drop funções existentes
DROP FUNCTION IF EXISTS get_daily_briefing(int);
DROP FUNCTION IF EXISTS get_all_channels_stats(int, int);
DROP FUNCTION IF EXISTS get_project_quick_status(int);
DROP FUNCTION IF EXISTS get_engagement_metrics(int);
DROP FUNCTION IF EXISTS analyze_channel_performance(int, int);
DROP FUNCTION IF EXISTS get_posts_by_date(int, date);
DROP FUNCTION IF EXISTS get_scheduled_posts(int, int);

-- 1. DAILY BRIEFING MOCK
CREATE OR REPLACE FUNCTION get_daily_briefing(p_project_id int)
RETURNS TABLE (
  metric_name text,
  value text,
  trend text,
  priority int
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('Canais monitorados'::text, '18'::text, '📺'::text, 1),
    ('Total de inscritos'::text, '1.2M'::text, '👥'::text, 2),
    ('Vídeos analisados'::text, '342'::text, '🎬'::text, 3),
    ('Engajamento médio'::text, '7.5%'::text, '🔥'::text, 4)
  ) AS t(metric_name, value, trend, priority)
  ORDER BY priority;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CHANNELS STATS MOCK
CREATE OR REPLACE FUNCTION get_all_channels_stats(
  p_project_id int,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  channel_name text,
  subscriber_count text,
  video_count int,
  avg_views text,
  last_update text
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('Tech Channel'::text, '250K'::text, 45::int, '15K'::text, '25/01 14h'::text),
    ('Gaming Pro'::text, '180K'::text, 89::int, '12K'::text, '25/01 10h'::text),
    ('Lifestyle Daily'::text, '95K'::text, 120::int, '8K'::text, '24/01 22h'::text),
    ('Cooking Master'::text, '72K'::text, 67::int, '5K'::text, '24/01 18h'::text),
    ('Music Vibes'::text, '45K'::text, 34::int, '3K'::text, '23/01 15h'::text)
  ) AS t(channel_name, subscriber_count, video_count, avg_views, last_update)
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. PROJECT STATUS MOCK
CREATE OR REPLACE FUNCTION get_project_quick_status(p_project_id int)
RETURNS TABLE (
  status_type text,
  status_value text,
  status_icon text
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('Projeto'::text, 'HW - Hardware Channel'::text, '🎯'::text),
    ('Status'::text, 'Ativo'::text, '✅'::text),
    ('Cobertura'::text, '18 canais, 342 vídeos'::text, '📊'::text)
  ) AS t(status_type, status_value, status_icon);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ENGAGEMENT METRICS MOCK
CREATE OR REPLACE FUNCTION get_engagement_metrics(p_project_id int)
RETURNS TABLE (
  engagement_type text,
  total_count bigint,
  percentage text,
  emoji text
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (VALUES
    ('Visualizações'::text, 2850000::bigint, '100%'::text, '👁️'::text),
    ('Curtidas'::text, 142500::bigint, '5.0%'::text, '❤️'::text),
    ('Comentários'::text, 28500::bigint, '1.0%'::text, '💬'::text),
    ('Vídeos analisados'::text, 342::bigint, '-'::text, '🎬'::text)
  ) AS t(engagement_type, total_count, percentage, emoji);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. PERFORMANCE ANALYSIS MOCK
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
  SELECT * FROM (VALUES
    ('Vídeos recentes'::text, '28 nos últimos 7 dias'::text, 'Alta atividade!'::text),
    ('Alcance médio'::text, '12.5K views'::text, 'Alcance excelente!'::text),
    ('Melhor vídeo'::text, '45.2K views'::text, 'Seu conteúdo de maior sucesso'::text)
  ) AS t(metric, value, insight);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. POSTS BY DATE MOCK
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
  SELECT * FROM (VALUES
    ('09:00'::text, '✅'::text, 'Novo vídeo sobre processadores Intel vs AMD...'::text, 'Intel Core i9 vs AMD Ryzen 9'::text, 'Tech Channel'::text),
    ('12:30'::text, '✅'::text, 'Review completo do novo smartphone...'::text, 'Samsung Galaxy S24 Ultra Review'::text, 'Tech Channel'::text),
    ('15:00'::text, '📅'::text, 'Gameplay exclusivo do novo jogo...'::text, 'Cyberpunk 2077 Phantom Liberty'::text, 'Gaming Pro'::text),
    ('18:00'::text, '📅'::text, 'Receita especial para o jantar...'::text, 'Lasanha Italiana Tradicional'::text, 'Cooking Master'::text)
  ) AS t(post_time, post_status, post_content, video_title, channel_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. SCHEDULED POSTS MOCK
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
  SELECT * FROM (VALUES
    ('26/01'::text, '10:00'::text, 'Unboxing do novo MacBook Pro M3...'::text, 'Tech Channel: MacBook Pro M3 Unboxing'::text),
    ('26/01'::text, '14:00'::text, 'Top 10 jogos indie de 2025...'::text, 'Gaming Pro: Best Indie Games 2025'::text),
    ('27/01'::text, '09:00'::text, 'Como organizar sua rotina matinal...'::text, 'Lifestyle Daily: Morning Routine Guide'::text)
  ) AS t(scheduled_date, scheduled_time, post_preview, video_info)
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;