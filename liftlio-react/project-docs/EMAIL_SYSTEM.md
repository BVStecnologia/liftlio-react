# EMAIL_SYSTEM.md - Sistema de Automação de Emails Liftlio

## 📧 Status Atual (31/07/2025)

### ✅ O que foi implementado hoje:

1. **Tabela `email_templates`** com 24 campos completos
   - Campos essenciais, controle, automação e análise
   - RLS configurado (permitindo acesso anônimo para Edge Functions)
   - 14 templates inseridos e ativos

2. **14 Templates de Email Criados**:
   - **Essential (5)**: Email confirmation, Password reset, Subscription confirmation, Payment successful/failed
   - **Very Important (5)**: Welcome email, Trial expiring, Mentions limit, Card expiring, Subscription suspended
   - **Important (4)**: Weekly report, Onboarding day 1, Re-engagement, High impact mention

3. **Testes Realizados**:
   - ✅ Envio simples funcionando
   - ✅ Template Welcome Email enviado com sucesso
   - ✅ Template Payment Receipt enviado com sucesso
   - ✅ Templates sendo renderizados corretamente

## 🔧 Como Funciona o Sistema

### Arquitetura:
```
Frontend → Edge Function (email-automation-engine) → Gmail MCP → Email enviado
              ↓
         email_logs (registro)
```

### Edge Function `email-automation-engine`:
- **Função**: Apenas envia emails (não busca templates)
- **Endpoint**: `https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/email-automation-engine`
- **Autenticação**: Bearer token (anon key funciona)

## 📝 Como Usar os Templates

### 1. Para enviar email com template do banco:

```javascript
// PASSO 1: Buscar template do banco
const { data: template } = await supabase
  .from('email_templates')
  .select('html_content, subject, variables')
  .eq('name', 'welcome-email')
  .single();

// PASSO 2: Substituir variáveis
let html = template.html_content;
const variables = {
  userName: 'Valdair',
  dashboardLink: 'https://app.liftlio.com/dashboard',
  // etc...
};

// Substituir {{variable}} no HTML
Object.keys(variables).forEach(key => {
  html = html.replace(new RegExp(`{{${key}}}`, 'g'), variables[key]);
});

// PASSO 3: Enviar via Edge Function
const { data, error } = await supabase.functions.invoke('email-automation-engine', {
  body: {
    to: 'user@example.com',
    subject: template.subject,
    html: html,
    complexity: 'medium'
  }
});
```

### 2. Para enviar email simples (sem template):

```javascript
await supabase.functions.invoke('email-automation-engine', {
  body: {
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<h1>Hello!</h1><p>This is a test.</p>',
    complexity: 'simple'
  }
});
```

## 🗄️ Tabelas do Sistema

### `email_templates`
- **Campos principais**: id, name, subject, html_content, variables, category, priority
- **RLS**: Permite leitura anônima de templates ativos
- **14 templates** já inseridos e prontos para uso

### `email_logs`
- **Função**: Registrar todos os emails enviados
- **Campos**: message_id, template_id, recipients, status, processing_time, error
- **Útil para**: Analytics, debugging, auditoria

## 📊 Queries Úteis

```sql
-- Ver todos os templates disponíveis
SELECT name, subject, category, priority 
FROM email_templates 
WHERE is_active = true
ORDER BY category, name;

-- Ver logs de emails enviados hoje
SELECT * FROM email_logs 
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC;

-- Taxa de sucesso por template
SELECT 
  t.name,
  COUNT(l.id) as total_sent,
  COUNT(CASE WHEN l.status = 'sent' THEN 1 END) as successful,
  AVG(l.processing_time) as avg_time_ms
FROM email_templates t
LEFT JOIN email_logs l ON t.id = l.template_id
WHERE l.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.id, t.name;
```

## 🚨 Pontos de Atenção

1. **Edge Function NÃO busca templates** - ela apenas envia emails
2. **Substituição de variáveis** deve ser feita no frontend/backend antes de enviar
3. **RLS foi ajustado** para permitir acesso anônimo aos templates ativos
4. **Segurança**: Remover políticas que usam `user_metadata` (inseguro)

## 📋 Próximos Passos

### Frontend:
1. [ ] Criar componente de gerenciamento de templates
2. [ ] Interface para visualizar logs de emails
3. [ ] Sistema de preview de emails antes de enviar
4. [ ] Configuração de preferências de email por usuário

### Backend:
1. [ ] Criar função RPC para buscar e processar templates
2. [ ] Sistema de filas para envio em massa
3. [ ] Webhook para tracking de opens/clicks
4. [ ] A/B testing de templates

### Edge Functions:
1. [ ] Criar função para processar bounces
2. [ ] Sistema de retry automático
3. [ ] Rate limiting por usuário
4. [ ] Validação de emails antes de enviar

## 🔗 Arquivos Relacionados

- **Documentação completa**: `/liftlio-react/email-automation-artifact.md`
- **SQL das tabelas**: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/SQL_Functions/email_templates_complete_system.sql`
- **Edge Function docs**: `/liftlio-react/AGENTE_LIFTLIO/MCP_Functions/Edge_Functions/EMAIL_AUTOMATION_ENGINE_DOCS.md`
- **Templates HTML**: `/liftlio-react/email-templates-liftlio-style.html`

## 💡 Dicas Importantes

1. **Sempre teste** templates em desenvolvimento antes de produção
2. **Use variáveis** para conteúdo dinâmico ({{userName}}, {{planName}}, etc)
3. **Monitore logs** regularmente para identificar problemas
4. **Complexity matters**: Use 'simple' para emails básicos, 'complex' para emails com muitas modificações
5. **HTML para emails** é diferente de HTML web - use tables e inline styles

## 🐛 Troubleshooting

### "Template not found"
- Verificar se RLS permite acesso ao template
- Confirmar que template está com `is_active = true`

### "Missing required fields"
- Edge Function requer: to, subject, e (html ou text)
- Certificar que todos os campos obrigatórios estão presentes

### Email não chegou
- Verificar logs com `mcp__supabase__get_logs` (service: 'edge-function')
- Conferir se Gmail MCP está rodando no servidor
- Verificar email_logs para status e erros

---

**Última atualização**: 31/07/2025
**Status**: Sistema funcionando em produção
**Emails de teste enviados**: 3 (todos com sucesso)