# 📧 Email Automation Engine - Documentação Completa

## 🚀 Visão Geral

A **Email Automation Engine** é uma Edge Function Supabase revolucionária que automatiza o envio de emails com integração ao MCP Gmail, manipulação avançada de HTML e timeout dinâmico baseado na complexidade da tarefa.

### Características Principais:
- 🧠 **Timeout Dinâmico**: De 30 segundos a 6.6 minutos
- 📨 **Integração MCP Gmail**: Envio confiável via Gmail API
- 🎨 **Manipulação HTML**: Modifica conteúdo em tempo real
- 📝 **Templates Dinâmicos**: Suporte a variáveis e templates
- 📊 **Logs Detalhados**: Rastreamento completo de emails
- 🔒 **Segurança**: Sanitização HTML com DOMPurify

## 📋 Endpoints

### POST `/functions/v1/email-automation-engine`

**Headers Obrigatórios:**
```
Authorization: Bearer YOUR_ANON_KEY
Content-Type: application/json
```

## 📝 Estrutura da Requisição

```typescript
interface EmailRequest {
  // Destinatários (string ou array)
  to: string | string[]
  
  // Assunto do email
  subject: string
  
  // Conteúdo HTML (opcional se usar template)
  html?: string
  
  // Conteúdo texto puro (opcional)
  text?: string
  
  // ID do template no banco (opcional)
  templateId?: string
  
  // Variáveis para substituição {{var}} ou ${var}
  variables?: Record<string, any>
  
  // Anexos (base64)
  attachments?: Array<{
    filename: string
    content: string
    encoding?: string
  }>
  
  // Complexidade: 'simple' | 'medium' | 'complex' | 'auto'
  complexity?: string
  
  // Ações de manipulação HTML
  actions?: Array<EmailAction>
}

interface EmailAction {
  type: 'replace' | 'append' | 'prepend' | 'remove' | 'addClass' | 'addStyle'
  selector?: string    // Seletor CSS
  content?: string     // Conteúdo HTML
  value?: string       // Valor para class ou style
}
```

## ⏱️ Sistema de Timeout Dinâmico

### Timeouts por Complexidade:
- **Simple (30s)**: Email básico sem modificações
- **Medium (120s)**: Email com template e variáveis
- **Complex (400s)**: Email com múltiplas ações e anexos

### Detecção Automática (complexity: 'auto'):
```
Pontuação = (ações × 2) + (anexos × 3) + (template ? 2 : 0) + (variáveis ? 1 : 0)

- Score >= 8: Complex
- Score >= 3: Medium  
- Score < 3: Simple
```

## 🎯 Casos de Uso

### 1. Email Simples
```json
{
  "to": "usuario@example.com",
  "subject": "Bem-vindo!",
  "html": "<h1>Olá!</h1><p>Seja bem-vindo ao Liftlio.</p>",
  "complexity": "simple"
}
```

### 2. Email com Template
```json
{
  "to": ["user1@example.com", "user2@example.com"],
  "subject": "Relatório Semanal",
  "templateId": "weekly-report-template",
  "variables": {
    "userName": "João",
    "videosAnalyzed": 1234,
    "weekDate": "24/07/2025"
  },
  "complexity": "medium"
}
```

### 3. Email com Manipulação HTML
```json
{
  "to": "admin@liftlio.com",
  "subject": "Notificação Personalizada",
  "html": "<div class='container'><h1>Título</h1><p class='content'>Conteúdo</p></div>",
  "actions": [
    {
      "type": "replace",
      "selector": "h1",
      "content": "Novo Título Dinâmico"
    },
    {
      "type": "addClass",
      "selector": ".content",
      "value": "highlight"
    },
    {
      "type": "addStyle",
      "selector": ".container",
      "value": "background: #f0f0f0; padding: 20px;"
    }
  ],
  "complexity": "complex"
}
```

### 4. Email com Anexos
```json
{
  "to": "finance@company.com",
  "subject": "Relatório Financeiro",
  "html": "<p>Segue relatório em anexo.</p>",
  "attachments": [
    {
      "filename": "relatorio_julho_2025.pdf",
      "content": "JVBERi0xLjQKJeLj...", // Base64
      "encoding": "base64"
    }
  ],
  "complexity": "complex"
}
```

## 🔧 Ações de Manipulação HTML

### Tipos de Ações:

1. **replace**: Substitui conteúdo de elementos
```json
{
  "type": "replace",
  "selector": ".price",
  "content": "<strong>R$ 99,90</strong>"
}
```

2. **append**: Adiciona conteúdo ao final
```json
{
  "type": "append",
  "selector": ".footer",
  "content": "<p>Powered by Liftlio</p>"
}
```

3. **prepend**: Adiciona conteúdo no início
```json
{
  "type": "prepend",
  "selector": ".header",
  "content": "<div class='alert'>Importante!</div>"
}
```

4. **remove**: Remove elementos
```json
{
  "type": "remove",
  "selector": ".ads"
}
```

5. **addClass**: Adiciona classe CSS
```json
{
  "type": "addClass",
  "selector": "button",
  "value": "btn-primary"
}
```

6. **addStyle**: Adiciona estilos inline
```json
{
  "type": "addStyle",
  "selector": ".highlight",
  "value": "color: red; font-weight: bold;"
}
```

## 📊 Resposta da API

### Sucesso:
```json
{
  "success": true,
  "messageId": "msg_abc123xyz",
  "processingTime": 1234,
  "htmlModifications": 5
}
```

### Erro:
```json
{
  "success": false,
  "error": "Template not found",
  "processingTime": 567
}
```

## 🗄️ Tabelas do Banco

### email_templates
```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT,
  text_content TEXT,
  variables JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID
);
```

### email_logs
```sql
CREATE TABLE email_logs (
  id UUID PRIMARY KEY,
  message_id TEXT,
  template_id UUID,
  recipients TEXT[],
  subject TEXT,
  complexity TEXT,
  processing_time INTEGER,
  modifications INTEGER,
  status TEXT,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  user_id UUID
);
```

## 🚀 Deploy e Configuração

### 1. Deploy da Edge Function:
```bash
supabase functions deploy email-automation-engine --no-verify-jwt
```

### 2. Configurar Variáveis de Ambiente:
- `MCP_GMAIL_URL`: URL do servidor MCP Gmail
- `MCP_GMAIL_API_KEY`: Chave de API do MCP Gmail

### 3. Criar Templates:
```sql
INSERT INTO email_templates (name, subject, html_content, variables)
VALUES (
  'welcome-email',
  'Bem-vindo ao Liftlio, {{userName}}!',
  '<h1>Olá {{userName}}!</h1><p>Seu plano {{planName}} está ativo.</p>',
  '["userName", "planName"]'::jsonb
);
```

## 🔐 Segurança

1. **Sanitização HTML**: Todo HTML é sanitizado com DOMPurify
2. **RLS**: Políticas de segurança em nível de linha
3. **Autenticação**: Requer token JWT válido
4. **Rate Limiting**: Implementar no API Gateway

## 📈 Monitoramento

### Consultar Logs:
```sql
-- Emails enviados hoje
SELECT * FROM email_logs 
WHERE created_at >= CURRENT_DATE
AND status = 'sent'
ORDER BY created_at DESC;

-- Taxa de erro
SELECT 
  status,
  COUNT(*) as total,
  AVG(processing_time) as avg_time
FROM email_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY status;
```

## 🎯 Melhores Práticas

1. **Use complexity 'auto'** para detecção automática
2. **Crie templates** para emails recorrentes
3. **Sanitize variáveis** antes de enviar
4. **Monitore logs** regularmente
5. **Teste ações HTML** antes de produção

## 🐛 Troubleshooting

### Erro: "Template not found"
- Verifique se o templateId existe no banco
- Confirme permissões RLS

### Erro: "MCP Gmail error"
- Verifique se o MCP Gmail está rodando
- Confirme URL e API Key

### Timeout excedido
- Aumente a complexidade ou divida em múltiplos emails
- Otimize ações HTML

## 🚀 Exemplos Avançados

### Email de Onboarding com 7 Dias
```javascript
const dias = [1, 2, 3, 4, 5, 6, 7];

for (const dia of dias) {
  await supabase.functions.invoke('email-automation-engine', {
    body: {
      to: user.email,
      templateId: `onboarding-day-${dia}`,
      variables: {
        userName: user.name,
        dayNumber: dia,
        nextLessonUrl: `https://liftlio.com/lessons/day-${dia}`
      },
      complexity: 'medium'
    }
  });
}
```

### Notificação em Massa com Personalização
```javascript
const users = await getActiveUsers();

const emailPromises = users.map(user => 
  supabase.functions.invoke('email-automation-engine', {
    body: {
      to: user.email,
      subject: `${user.name}, você tem novidades!`,
      html: baseHtml,
      actions: [
        {
          type: 'replace',
          selector: '.user-stats',
          content: `<div>Seus ${user.videoCount} vídeos foram analisados!</div>`
        }
      ],
      complexity: 'auto'
    }
  })
);

await Promise.all(emailPromises);
```

---

**Versão**: 1.0  
**Última Atualização**: 24/07/2025  
**Autor**: Liftlio Team