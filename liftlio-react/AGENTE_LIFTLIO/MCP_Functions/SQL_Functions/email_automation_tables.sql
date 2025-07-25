-- Script SQL: Tabelas para Email Automation Engine
-- Criado em: 24/07/2025
-- Objetivo: Suportar sistema de automação de emails com templates e logs

-- Criar tabela de templates de email
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT,
  text_content TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Criar tabela de logs de email
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  template_id UUID REFERENCES email_templates(id),
  recipients TEXT[],
  subject TEXT,
  complexity TEXT CHECK (complexity IN ('simple', 'medium', 'complex')),
  processing_time INTEGER,
  modifications INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('sent', 'failed', 'pending')),
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(name);

-- RLS para templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates" ON email_templates
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create templates" ON email_templates
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates" ON email_templates
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS para logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs" ON email_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create email logs" ON email_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Templates de exemplo
INSERT INTO email_templates (name, subject, html_content, text_content, variables)
VALUES 
  (
    'welcome-email',
    'Bem-vindo ao Liftlio, {{userName}}!',
    '<html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto;">
          <h1 style="color: #4A90E2;">Olá {{userName}}!</h1>
          <p>Bem-vindo ao Liftlio! Estamos muito felizes em ter você conosco.</p>
          <p>Seu plano <strong>{{planName}}</strong> está ativo e pronto para uso.</p>
          <div style="margin: 30px 0;">
            <a href="{{activationLink}}" style="background: #4A90E2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">
              Ativar Conta
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">Se você tiver qualquer dúvida, estamos aqui para ajudar!</p>
        </div>
      </body>
    </html>',
    'Olá {{userName}}! Bem-vindo ao Liftlio. Seu plano {{planName}} está ativo. Ative sua conta em: {{activationLink}}',
    '["userName", "planName", "activationLink"]'::jsonb
  ),
  (
    'weekly-report',
    'Relatório Semanal - {{weekDate}}',
    '<html>
      <body style="font-family: Arial, sans-serif;">
        <h1>Relatório Semanal</h1>
        <p>Olá {{userName}},</p>
        <p>Aqui está seu resumo da semana:</p>
        <ul>
          <li>Vídeos analisados: {{videosAnalyzed}}</li>
          <li>Sentimento médio: {{avgSentiment}}</li>
          <li>Engajamento total: {{totalEngagement}}</li>
        </ul>
      </body>
    </html>',
    'Relatório Semanal - Vídeos: {{videosAnalyzed}}, Sentimento: {{avgSentiment}}, Engajamento: {{totalEngagement}}',
    '["userName", "weekDate", "videosAnalyzed", "avgSentiment", "totalEngagement"]'::jsonb
  );

-- Queries úteis para monitoramento

-- Ver emails enviados hoje
-- SELECT * FROM email_logs 
-- WHERE created_at >= CURRENT_DATE
-- AND status = 'sent'
-- ORDER BY created_at DESC;

-- Taxa de sucesso por complexidade
-- SELECT 
--   complexity,
--   COUNT(*) FILTER (WHERE status = 'sent') as sent,
--   COUNT(*) FILTER (WHERE status = 'failed') as failed,
--   ROUND(AVG(processing_time)) as avg_time_ms
-- FROM email_logs
-- WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
-- GROUP BY complexity;

-- Templates mais usados
-- SELECT 
--   t.name,
--   COUNT(l.id) as usage_count,
--   MAX(l.created_at) as last_used
-- FROM email_templates t
-- LEFT JOIN email_logs l ON t.id = l.template_id
-- GROUP BY t.id, t.name
-- ORDER BY usage_count DESC;