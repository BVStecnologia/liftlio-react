# Melhorias do Sistema Agente Liftlio

## 1. Sistema de Tickets de Suporte

### Tabela: support_tickets
```sql
CREATE TABLE support_tickets (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id BIGINT REFERENCES "Projetos"(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('bug', 'feature', 'question', 'other')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')) DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabela de respostas
CREATE TABLE support_ticket_messages (
  id SERIAL PRIMARY KEY,
  ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  attachments JSONB DEFAULT '[]'::jsonb
);

-- Índices
CREATE INDEX idx_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_ticket_messages ON support_ticket_messages(ticket_id);
```

### RPC: create_support_ticket
```sql
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_title TEXT,
  p_description TEXT,
  p_category TEXT DEFAULT 'question',
  p_priority TEXT DEFAULT 'medium',
  p_project_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_id BIGINT;
BEGIN
  INSERT INTO support_tickets (
    user_id,
    project_id,
    title,
    description,
    category,
    priority
  ) VALUES (
    auth.uid(),
    p_project_id,
    p_title,
    p_description,
    p_category,
    p_priority
  )
  RETURNING id INTO v_ticket_id;
  
  -- Criar notificação para admin
  PERFORM create_notification(
    'new_ticket',
    json_build_object(
      'ticket_id', v_ticket_id,
      'title', p_title,
      'user_id', auth.uid()
    )
  );
  
  RETURN v_ticket_id;
END;
$$;
```

## 2. Botões de Ação no Agente

### Atualização na resposta do agente:
```typescript
// Detectar intenções e sugerir ações
function detectIntentAndActions(prompt: string, context: any): ActionButton[] {
  const actions: ActionButton[] = [];
  
  // Análise
  if (prompt.match(/anális|analyz|performance|desempenho/i)) {
    actions.push({
      id: 'analyze_full',
      label: '📊 Análise Completa',
      icon: '📊',
      action: 'channel_performance_analysis',
      tooltip: 'Ver análise detalhada de todos os canais'
    });
  }
  
  // Postagens
  if (prompt.match(/post|agendar|schedule|quando/i)) {
    actions.push({
      id: 'schedule_view',
      label: '📅 Ver Agendamentos',
      icon: '📅',
      action: 'view_scheduled_posts',
      tooltip: 'Ver todas as postagens agendadas'
    });
    
    actions.push({
      id: 'best_time',
      label: '⏰ Melhores Horários',
      icon: '⏰',
      action: 'optimal_posting_schedule',
      tooltip: 'Descobrir os melhores horários para postar'
    });
  }
  
  // Sempre mostrar opção de suporte
  actions.push({
    id: 'create_ticket',
    label: '🎫 Preciso de Ajuda',
    icon: '🎫',
    action: 'create_support_ticket',
    tooltip: 'Criar um ticket de suporte'
  });
  
  return actions;
}

// Exemplo de resposta com ações
{
  response: "Identifiquei que você quer analisar a performance. Aqui estão algumas opções:",
  actions: [
    {
      id: "perf_channels",
      label: "📊 Performance por Canal",
      action: "channel_performance_analysis"
    },
    {
      id: "perf_videos", 
      label: "🎬 Engajamento de Vídeos",
      action: "video_engagement_metrics"
    },
    {
      id: "perf_schedule",
      label: "⏰ Melhores Horários",
      action: "optimal_posting_schedule"
    }
  ],
  metadata: {
    intent: "analysis",
    confidence: 0.85
  }
}
```

## 3. Mensagem Diária Automática

### RPC: get_daily_insight
```sql
CREATE OR REPLACE FUNCTION get_daily_insight(p_project_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_insight JSONB;
  v_day_of_week INT;
  v_insight_type TEXT;
BEGIN
  -- Determinar tipo de insight baseado no dia
  v_day_of_week := EXTRACT(DOW FROM NOW());
  
  CASE v_day_of_week
    WHEN 1 THEN v_insight_type := 'weekly_summary';      -- Segunda
    WHEN 2 THEN v_insight_type := 'top_performer';       -- Terça
    WHEN 3 THEN v_insight_type := 'engagement_trend';    -- Quarta
    WHEN 4 THEN v_insight_type := 'upcoming_posts';      -- Quinta
    WHEN 5 THEN v_insight_type := 'week_comparison';     -- Sexta
    WHEN 6 THEN v_insight_type := 'weekend_activity';    -- Sábado
    WHEN 0 THEN v_insight_type := 'week_preparation';    -- Domingo
  END CASE;
  
  -- Gerar insight baseado no tipo
  CASE v_insight_type
    WHEN 'weekly_summary' THEN
      v_insight := json_build_object(
        'type', 'weekly_summary',
        'title', '📊 Resumo Semanal',
        'emoji', '📊',
        'metrics', (
          SELECT json_build_object(
            'posts_last_week', COUNT(*) FILTER (WHERE postado >= NOW() - INTERVAL '7 days'),
            'scheduled_this_week', COUNT(*) FILTER (WHERE proxima_postagem BETWEEN NOW() AND NOW() + INTERVAL '7 days'),
            'response_rate', ROUND(AVG(CASE WHEN postado IS NOT NULL THEN 100 ELSE 0 END), 1)
          )
          FROM "Settings messages posts"
          WHERE "Projeto" = p_project_id
        ),
        'message', 'Começando a semana! Na semana passada você fez ' || 
                   (SELECT COUNT(*) FROM "Settings messages posts" 
                    WHERE "Projeto" = p_project_id 
                    AND postado >= NOW() - INTERVAL '7 days') || 
                   ' postagens. Vamos superar essa marca? 💪'
      );
      
    WHEN 'top_performer' THEN
      v_insight := json_build_object(
        'type', 'top_performer',
        'title', '🏆 Canal Destaque',
        'emoji', '🏆',
        'data', (
          SELECT json_build_object(
            'channel_name', v."Channel",
            'posts_count', COUNT(smp.id),
            'avg_response_time', ROUND(EXTRACT(EPOCH FROM AVG(smp.postado - smp.created_at))/3600, 1)
          )
          FROM "Settings messages posts" smp
          JOIN "Videos" v ON smp."Videos" = v.id
          WHERE smp."Projeto" = p_project_id
          AND smp.postado >= NOW() - INTERVAL '30 days'
          GROUP BY v."Channel"
          ORDER BY COUNT(smp.id) DESC
          LIMIT 1
        ),
        'message', 'Seu canal mais ativo este mês está bombando! 🚀'
      );
      
    WHEN 'upcoming_posts' THEN
      v_insight := json_build_object(
        'type', 'upcoming_posts',
        'title', '📅 Agenda de Hoje',
        'emoji', '📅',
        'metrics', (
          SELECT json_build_object(
            'posts_today', COUNT(*) FILTER (WHERE DATE(proxima_postagem) = CURRENT_DATE),
            'posts_next_24h', COUNT(*) FILTER (WHERE proxima_postagem BETWEEN NOW() AND NOW() + INTERVAL '24 hours'),
            'next_post_time', MIN(proxima_postagem)
          )
          FROM "Settings messages posts"
          WHERE "Projeto" = p_project_id
          AND proxima_postagem > NOW()
        ),
        'message', 'Você tem ' || 
                   (SELECT COUNT(*) FROM "Settings messages posts" 
                    WHERE "Projeto" = p_project_id 
                    AND DATE(proxima_postagem) = CURRENT_DATE) || 
                   ' posts agendados para hoje. Tudo pronto! ✅'
      );
      
    ELSE
      -- Insight genérico
      v_insight := json_build_object(
        'type', 'daily_stats',
        'title', '📈 Status do Dia',
        'emoji', '📈',
        'metrics', (
          SELECT json_build_object(
            'total_posts', COUNT(*) FILTER (WHERE postado IS NOT NULL),
            'scheduled', COUNT(*) FILTER (WHERE proxima_postagem > NOW()),
            'posts_today', COUNT(*) FILTER (WHERE DATE(postado) = CURRENT_DATE)
          )
          FROM "Settings messages posts"
          WHERE "Projeto" = p_project_id
        ),
        'message', 'Mais um dia produtivo no Liftlio! Continue assim! 🎯'
      );
  END CASE;
  
  -- Adicionar timestamp
  v_insight := v_insight || jsonb_build_object('generated_at', NOW());
  
  RETURN v_insight;
END;
$$;
```

### Componente React para Daily Insight:
```typescript
const DailyInsight: React.FC = () => {
  const [insight, setInsight] = useState(null);
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const checkDailyInsight = async () => {
      const lastShown = localStorage.getItem('lastDailyInsight');
      const today = new Date().toDateString();
      
      if (lastShown !== today) {
        const { data } = await supabase.rpc('get_daily_insight', {
          p_project_id: currentProject.id
        });
        
        if (data) {
          setInsight(data);
          setShow(true);
          localStorage.setItem('lastDailyInsight', today);
        }
      }
    };
    
    checkDailyInsight();
  }, []);
  
  if (!show || !insight) return null;
  
  return (
    <AnimatedCard className="daily-insight">
      <span className="emoji">{insight.emoji}</span>
      <h3>{insight.title}</h3>
      <p>{insight.message}</p>
      {insight.metrics && (
        <div className="metrics">
          {/* Renderizar métricas baseado no tipo */}
        </div>
      )}
      <button onClick={() => setShow(false)}>Entendi!</button>
    </AnimatedCard>
  );
};
```

## 4. Melhorias na Interface do Agente

### FloatingAgent.tsx atualizado:
```typescript
// Adicionar suporte a botões de ação
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
  ticketId?: number;
}

// Renderizar botões de ação
{message.actions && (
  <div className="action-buttons">
    {message.actions.map(action => (
      <button
        key={action.id}
        className="action-btn"
        onClick={() => handleAction(action)}
        title={action.tooltip}
      >
        {action.icon} {action.label}
      </button>
    ))}
  </div>
)}
```

## 5. Sistema de Notificações

### Tabela de notificações:
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para notificar respostas de tickets
CREATE OR REPLACE FUNCTION notify_ticket_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id != (SELECT user_id FROM support_tickets WHERE id = NEW.ticket_id) THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT 
      user_id,
      'ticket_response',
      'Nova resposta no ticket #' || NEW.ticket_id,
      SUBSTRING(NEW.message, 1, 100) || '...',
      json_build_object('ticket_id', NEW.ticket_id)
    FROM support_tickets
    WHERE id = NEW.ticket_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Prioridades de Implementação:

1. **Alta Prioridade:**
   - Daily insights (fácil e impacto imediato)
   - Botões de ação no agente

2. **Média Prioridade:**
   - Sistema de tickets de suporte
   - Notificações

3. **Baixa Prioridade:**
   - Melhorias visuais
   - Animações