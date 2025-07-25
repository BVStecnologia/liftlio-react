-- Sistema de Tools para Agente Liftlio v61
-- Permite controle granular das ações do agente

-- Tabela principal de tools
CREATE TABLE IF NOT EXISTS agent_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text NOT NULL,
  function_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('summary', 'listing', 'analysis', 'search', 'action')),
  parameters jsonb DEFAULT '[]'::jsonb,
  output_format text DEFAULT 'markdown',
  max_results int DEFAULT 10,
  cache_duration int DEFAULT 300, -- segundos
  usage_count int DEFAULT 0,
  last_used timestamp,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_agent_tools_name ON agent_tools(name);
CREATE INDEX idx_agent_tools_category ON agent_tools(category);
CREATE INDEX idx_agent_tools_active ON agent_tools(is_active);

-- Tabela de logs de uso
CREATE TABLE IF NOT EXISTS agent_tool_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES agent_tools(id),
  user_id text,
  project_id int,
  input_params jsonb,
  execution_time_ms int,
  success boolean,
  error_message text,
  created_at timestamp DEFAULT now()
);

-- Popular tools iniciais
INSERT INTO agent_tools (name, description, function_name, category, parameters) VALUES
-- Sumários
('daily_briefing', 'Resumo executivo do dia', 'get_daily_briefing', 'summary', 
  '[{"name": "project_id", "type": "int", "required": true}]'::jsonb),
  
('project_status', 'Status geral do projeto', 'get_project_quick_status', 'summary',
  '[{"name": "project_id", "type": "int", "required": true}]'::jsonb),

-- Listagens
('list_channels', 'Lista todos os canais com estatísticas', 'get_all_channels_stats', 'listing',
  '[{"name": "project_id", "type": "int", "required": true}, {"name": "limit", "type": "int", "required": false}]'::jsonb),

('today_posts', 'Posts de hoje (postados e agendados)', 'get_posts_by_date', 'listing',
  '[{"name": "project_id", "type": "int", "required": true}, {"name": "date", "type": "date", "required": true}]'::jsonb),

('scheduled_posts', 'Posts agendados futuros', 'get_scheduled_posts', 'listing',
  '[{"name": "project_id", "type": "int", "required": true}, {"name": "days_ahead", "type": "int", "required": false}]'::jsonb),

-- Análises
('performance_analysis', 'Análise de performance dos canais', 'analyze_channel_performance', 'analysis',
  '[{"name": "project_id", "type": "int", "required": true}, {"name": "days", "type": "int", "required": false}]'::jsonb),

('engagement_metrics', 'Métricas de engajamento', 'get_engagement_metrics', 'analysis',
  '[{"name": "project_id", "type": "int", "required": true}]'::jsonb),

-- Busca
('search_content', 'Busca semântica no conteúdo', 'search_rag_enhanced', 'search',
  '[{"name": "query", "type": "text", "required": true}, {"name": "project_id", "type": "int", "required": false}]'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  function_name = EXCLUDED.function_name,
  parameters = EXCLUDED.parameters,
  updated_at = now();

-- Função para registrar uso de tool
CREATE OR REPLACE FUNCTION log_tool_usage(
  p_tool_name text,
  p_user_id text,
  p_project_id int,
  p_params jsonb,
  p_execution_time int,
  p_success boolean,
  p_error text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Atualizar contador
  UPDATE agent_tools 
  SET usage_count = usage_count + 1,
      last_used = now()
  WHERE name = p_tool_name;
  
  -- Inserir log
  INSERT INTO agent_tool_logs (
    tool_id, user_id, project_id, input_params, 
    execution_time_ms, success, error_message
  )
  SELECT 
    id, p_user_id, p_project_id, p_params,
    p_execution_time, p_success, p_error
  FROM agent_tools
  WHERE name = p_tool_name;
END;
$$ LANGUAGE plpgsql;

-- Função para obter tool mais apropriada
CREATE OR REPLACE FUNCTION get_best_tool_for_intent(
  p_intent text,
  p_keywords text[]
) RETURNS TABLE (
  tool_name text,
  tool_function text,
  tool_category text,
  confidence numeric
) AS $$
BEGIN
  RETURN QUERY
  WITH tool_scores AS (
    SELECT 
      t.name as tool_name,
      t.function_name as tool_function,
      t.category as tool_category,
      CASE
        -- Exact intent match
        WHEN p_intent = 'daily_status' AND t.name = 'daily_briefing' THEN 1.0
        WHEN p_intent = 'list_channels' AND t.name = 'list_channels' THEN 1.0
        WHEN p_intent = 'today_activity' AND t.name = 'today_posts' THEN 1.0
        WHEN p_intent = 'performance' AND t.name = 'performance_analysis' THEN 1.0
        -- Keyword matching
        WHEN p_keywords && ARRAY['status', 'resumo', 'overview'] AND t.category = 'summary' THEN 0.8
        WHEN p_keywords && ARRAY['listar', 'list', 'todos', 'all'] AND t.category = 'listing' THEN 0.8
        WHEN p_keywords && ARRAY['análise', 'analysis', 'métricas'] AND t.category = 'analysis' THEN 0.8
        ELSE 0.0
      END as confidence
    FROM agent_tools t
    WHERE t.is_active = true
  )
  SELECT * FROM tool_scores
  WHERE confidence > 0
  ORDER BY confidence DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;