-- =============================================
-- Admin Analytics System
-- Tracking interno do liftlio.com para o Admin
-- Nao usa VPS (track.liftlio.com) - Direto no Supabase
-- Criado: 2025-12-28
-- =============================================

-- =============================================
-- TABELA: admin_analytics
-- Armazena todos os eventos de analytics do admin
-- =============================================
CREATE TABLE IF NOT EXISTS admin_analytics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  visitor_id VARCHAR(32) NOT NULL,
  session_id VARCHAR(32),
  event_type VARCHAR(20) NOT NULL DEFAULT 'pageview',
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  device_type VARCHAR(10),
  browser VARCHAR(20),
  country VARCHAR(2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  time_on_page INTEGER,
  scroll_depth INTEGER,
  click_target TEXT,
  custom_data JSONB
);

-- Indices para performance
CREATE INDEX IF NOT EXISTS idx_admin_analytics_created ON admin_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_analytics_user ON admin_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_analytics_visitor ON admin_analytics(visitor_id);

-- Habilitar Realtime
ALTER TABLE admin_analytics REPLICA IDENTITY FULL;

-- =============================================
-- TABELA: admin_presence
-- Visitantes ativos em tempo real
-- =============================================
CREATE TABLE IF NOT EXISTS admin_presence (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  visitor_id VARCHAR(32) NOT NULL UNIQUE,
  session_id VARCHAR(32),
  current_page TEXT NOT NULL,
  user_email TEXT,
  device_type VARCHAR(10),
  browser VARCHAR(20),
  country VARCHAR(2),
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  page_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE
);

-- Indice para visitantes ativos
CREATE INDEX IF NOT EXISTS idx_admin_presence_active ON admin_presence(is_active, last_seen);

-- Habilitar Realtime
ALTER TABLE admin_presence REPLICA IDENTITY FULL;

-- =============================================
-- RPC: track_admin_event
-- Insere um novo evento de analytics
-- =============================================
CREATE OR REPLACE FUNCTION track_admin_event(
  p_user_id UUID DEFAULT NULL,
  p_visitor_id VARCHAR DEFAULT NULL,
  p_session_id VARCHAR DEFAULT NULL,
  p_event_type VARCHAR DEFAULT 'pageview',
  p_page_path TEXT DEFAULT '',
  p_page_title TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_device_type VARCHAR DEFAULT NULL,
  p_browser VARCHAR DEFAULT NULL,
  p_country VARCHAR DEFAULT NULL,
  p_time_on_page INTEGER DEFAULT NULL,
  p_scroll_depth INTEGER DEFAULT NULL,
  p_click_target TEXT DEFAULT NULL,
  p_custom_data JSONB DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO admin_analytics (
    user_id, visitor_id, session_id, event_type, page_path,
    page_title, referrer, device_type, browser, country,
    time_on_page, scroll_depth, click_target, custom_data
  ) VALUES (
    p_user_id, p_visitor_id, p_session_id, p_event_type, p_page_path,
    p_page_title, p_referrer, p_device_type, p_browser, p_country,
    p_time_on_page, p_scroll_depth, p_click_target, p_custom_data
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- RPC: upsert_admin_presence
-- Atualiza ou insere presenca de visitante
-- =============================================
CREATE OR REPLACE FUNCTION upsert_admin_presence(
  p_user_id UUID DEFAULT NULL,
  p_visitor_id VARCHAR DEFAULT NULL,
  p_session_id VARCHAR DEFAULT NULL,
  p_current_page TEXT DEFAULT '',
  p_user_email TEXT DEFAULT NULL,
  p_device_type VARCHAR DEFAULT NULL,
  p_browser VARCHAR DEFAULT NULL,
  p_country VARCHAR DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_presence (
    user_id, visitor_id, session_id, current_page,
    user_email, device_type, browser, country, last_seen, page_count
  ) VALUES (
    p_user_id, p_visitor_id, p_session_id, p_current_page,
    p_user_email, p_device_type, p_browser, p_country, NOW(), 1
  )
  ON CONFLICT (visitor_id) DO UPDATE SET
    current_page = EXCLUDED.current_page,
    last_seen = NOW(),
    page_count = admin_presence.page_count + 1,
    is_active = TRUE,
    user_id = COALESCE(EXCLUDED.user_id, admin_presence.user_id),
    user_email = COALESCE(EXCLUDED.user_email, admin_presence.user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ARQUITETURA
-- =============================================
--
-- CLIENTES (externo)          ADMIN (interno)
--      |                           |
--      v                           v
-- track.liftlio.com          React App liftlio.com
--      |                           |
--      v                           v
-- tabela: analytics          tabela: admin_analytics
-- (projeto_id variado)       (sem projeto_id - interno)
--
-- O Admin Dashboard usa Realtime subscriptions para
-- receber eventos em tempo real das tabelas admin_*
-- =============================================
