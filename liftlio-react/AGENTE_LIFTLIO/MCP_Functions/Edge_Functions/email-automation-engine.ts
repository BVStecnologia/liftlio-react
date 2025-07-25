import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import DOMPurify from 'https://esm.sh/isomorphic-dompurify@2.15.0'

/**
 * EMAIL AUTOMATION ENGINE - EDGE FUNCTION
 * =======================================
 * Versão: 1.0 | Data: 24/07/2025
 * 
 * IMPORTANTE: Esta função NÃO entende linguagem natural!
 * Você deve enviar um JSON estruturado com os parâmetros corretos.
 * 
 * ❌ NÃO FUNCIONA: { "instruction": "mande email para valdair" }
 * ✅ FUNCIONA: { "to": "valdair@email.com", "subject": "Olá", "html": "<p>Oi</p>" }
 * 
 * FUNCIONALIDADES:
 * ----------------
 * 1. Envio de emails simples ou complexos via MCP Gmail
 * 2. Modificação de HTML em tempo real (6 tipos de ações)
 * 3. Templates dinâmicos com variáveis {{var}} ou ${var}
 * 4. Múltiplos destinatários
 * 5. Anexos em base64
 * 6. Timeout dinâmico: 30s (simple), 120s (medium), 400s (complex)
 * 7. Logs completos para analytics
 * 
 * EXEMPLOS DE USO:
 * ----------------
 * 
 * 1. EMAIL SIMPLES:
 * {
 *   "to": "user@email.com",
 *   "subject": "Olá!",
 *   "html": "<h1>Bem-vindo!</h1>"
 * }
 * 
 * 2. EMAIL COM TEMPLATE:
 * {
 *   "to": "user@email.com",
 *   "templateId": "welcome-email",
 *   "variables": {
 *     "userName": "João",
 *     "planName": "Premium"
 *   }
 * }
 * 
 * 3. EMAIL COM MODIFICAÇÕES HTML:
 * {
 *   "to": "user@email.com",
 *   "subject": "Promoção",
 *   "html": "<p class='price'>R$ 0</p>",
 *   "actions": [{
 *     "type": "replace",
 *     "selector": ".price",
 *     "content": "<strong>R$ 99,90</strong>"
 *   }]
 * }
 * 
 * 4. EMAIL COM MÚLTIPLOS DESTINATÁRIOS:
 * {
 *   "to": ["user1@email.com", "user2@email.com"],
 *   "subject": "Notificação",
 *   "html": "<p>Mensagem importante</p>"
 * }
 * 
 * 5. EMAIL COM ANEXOS:
 * {
 *   "to": "user@email.com",
 *   "subject": "Relatório",
 *   "html": "<p>Segue anexo</p>",
 *   "attachments": [{
 *     "filename": "relatorio.pdf",
 *     "content": "base64_content_here",
 *     "encoding": "base64"
 *   }]
 * }
 * 
 * AÇÕES HTML DISPONÍVEIS:
 * -----------------------
 * - replace: Substitui conteúdo
 * - append: Adiciona ao final
 * - prepend: Adiciona no início
 * - remove: Remove elementos
 * - addClass: Adiciona classes CSS
 * - addStyle: Adiciona estilos inline
 * 
 * COMPLEXIDADE:
 * -------------
 * - simple: Email básico (30s timeout)
 * - medium: Com template/variáveis (120s timeout)
 * - complex: Múltiplas ações/anexos (400s timeout)
 * - auto: Detecta automaticamente
 * 
 * RESPOSTA:
 * ---------
 * {
 *   "success": true,
 *   "messageId": "msg_123",
 *   "processingTime": 1234,
 *   "htmlModifications": 5
 * }
 * 
 * CONFIGURAÇÃO NECESSÁRIA:
 * ------------------------
 * Variáveis de ambiente:
 * - MCP_GMAIL_URL: URL do servidor MCP Gmail
 * - MCP_GMAIL_API_KEY: Chave API do MCP Gmail
 * 
 * INTEGRAÇÃO COM TRIGGERS:
 * ------------------------
 * Para usar com triggers do Supabase, passe os dados no formato JSON:
 * 
 * CREATE TRIGGER send_welcome_email
 * AFTER INSERT ON auth.users
 * FOR EACH ROW
 * EXECUTE FUNCTION supabase.http_request(
 *   'POST',
 *   'https://project.supabase.co/functions/v1/email-automation-engine',
 *   '{"Content-Type":"application/json"}',
 *   '{"to":"' || NEW.email || '","templateId":"welcome-email","variables":{"userName":"' || NEW.name || '"}}'
 * );
 */

interface EmailRequest {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  templateId?: string
  variables?: Record<string, any>
  attachments?: Array<{
    filename: string
    content: string
    encoding?: string
  }>
  complexity?: 'simple' | 'medium' | 'complex' | 'auto'
  actions?: Array<EmailAction>
}

interface EmailAction {
  type: 'replace' | 'append' | 'prepend' | 'remove' | 'addClass' | 'addStyle'
  selector?: string
  content?: string
  attribute?: string
  value?: string
}

interface EmailResponse {
  success: boolean
  messageId?: string
  error?: string
  processingTime?: number
  htmlModifications?: number
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuração de timeouts dinâmicos (em segundos)
const TIMEOUTS = {
  simple: 30,    // Email simples sem modificações
  medium: 120,   // Email com template e variáveis
  complex: 400,  // Email com múltiplas ações e anexos (6.6 minutos)
}

// MCP Gmail Configuration
const MCP_GMAIL_URL = Deno.env.get('MCP_GMAIL_URL') || 'http://173.249.22.2:3000'
const MCP_GMAIL_KEY = Deno.env.get('MCP_GMAIL_API_KEY') || ''

// Determinar complexidade automaticamente
function determineComplexity(request: EmailRequest): 'simple' | 'medium' | 'complex' {
  const actionCount = request.actions?.length || 0
  const attachmentCount = request.attachments?.length || 0
  const hasTemplate = !!request.templateId
  const hasVariables = request.variables && Object.keys(request.variables).length > 0
  
  // Pontuação de complexidade
  let score = 0
  score += actionCount * 2
  score += attachmentCount * 3
  score += hasTemplate ? 2 : 0
  score += hasVariables ? 1 : 0
  
  if (score >= 8) return 'complex'
  if (score >= 3) return 'medium'
  return 'simple'
}

// Processar ações de HTML
function processHtmlActions(html: string, actions: EmailAction[]): { html: string, modifications: number } {
  let modifiedHtml = html
  let modifications = 0
  
  // Parse HTML com DOMPurify para segurança
  const clean = DOMPurify.sanitize(html, { 
    WHOLE_DOCUMENT: true,
    RETURN_DOM: false,
    ADD_TAGS: ['style'],
    ADD_ATTR: ['style', 'class']
  })
  
  // Criar um parser HTML simples para manipulação
  const parser = new DOMParser()
  const doc = parser.parseFromString(clean, 'text/html')
  
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'replace':
          if (action.selector && action.content) {
            const elements = doc.querySelectorAll(action.selector)
            elements.forEach(el => {
              el.innerHTML = DOMPurify.sanitize(action.content!)
              modifications++
            })
          }
          break
          
        case 'append':
          if (action.selector && action.content) {
            const elements = doc.querySelectorAll(action.selector)
            elements.forEach(el => {
              el.innerHTML += DOMPurify.sanitize(action.content!)
              modifications++
            })
          }
          break
          
        case 'prepend':
          if (action.selector && action.content) {
            const elements = doc.querySelectorAll(action.selector)
            elements.forEach(el => {
              el.innerHTML = DOMPurify.sanitize(action.content!) + el.innerHTML
              modifications++
            })
          }
          break
          
        case 'remove':
          if (action.selector) {
            const elements = doc.querySelectorAll(action.selector)
            elements.forEach(el => {
              el.remove()
              modifications++
            })
          }
          break
          
        case 'addClass':
          if (action.selector && action.value) {
            const elements = doc.querySelectorAll(action.selector)
            elements.forEach(el => {
              el.classList.add(action.value!)
              modifications++
            })
          }
          break
          
        case 'addStyle':
          if (action.selector && action.value) {
            const elements = doc.querySelectorAll(action.selector)
            elements.forEach(el => {
              (el as HTMLElement).style.cssText += action.value!
              modifications++
            })
          }
          break
      }
    } catch (error) {
      console.error('Error processing action:', action, error)
    }
  }
  
  return {
    html: doc.documentElement.outerHTML,
    modifications
  }
}

// Substituir variáveis no template
function replaceTemplateVariables(content: string, variables: Record<string, any>): string {
  let processedContent = content
  
  // Substituir variáveis no formato {{variavel}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    processedContent = processedContent.replace(regex, String(value))
  })
  
  // Substituir variáveis no formato ${variavel}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'g')
    processedContent = processedContent.replace(regex, String(value))
  })
  
  return processedContent
}

// Buscar template do banco de dados
async function fetchTemplate(supabase: any, templateId: string): Promise<{ html?: string, text?: string }> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('html_content, text_content')
    .eq('id', templateId)
    .single()
  
  if (error || !data) {
    throw new Error(`Template ${templateId} not found`)
  }
  
  return {
    html: data.html_content,
    text: data.text_content
  }
}

// Enviar email via MCP Gmail
async function sendEmailViaMCP(emailData: any): Promise<{ messageId?: string, error?: string }> {
  try {
    const response = await fetch(`${MCP_GMAIL_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_GMAIL_KEY}`
      },
      body: JSON.stringify(emailData)
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { error: result.error || 'Failed to send email' }
    }
    
    return { messageId: result.messageId }
  } catch (error) {
    return { error: `MCP Gmail error: ${error.message}` }
  }
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  const startTime = Date.now()
  
  try {
    // Parse request
    const request: EmailRequest = await req.json()
    
    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization')!
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    
    // Determinar complexidade e timeout
    const complexity = request.complexity === 'auto' 
      ? determineComplexity(request) 
      : request.complexity || 'simple'
    
    const timeout = TIMEOUTS[complexity]
    
    // Configurar AbortController para timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000)
    
    try {
      // Preparar conteúdo do email
      let htmlContent = request.html
      let textContent = request.text
      let modifications = 0
      
      // Buscar template se especificado
      if (request.templateId) {
        const template = await fetchTemplate(supabase, request.templateId)
        htmlContent = template.html || htmlContent
        textContent = template.text || textContent
      }
      
      // Substituir variáveis
      if (request.variables) {
        if (htmlContent) {
          htmlContent = replaceTemplateVariables(htmlContent, request.variables)
        }
        if (textContent) {
          textContent = replaceTemplateVariables(textContent, request.variables)
        }
      }
      
      // Processar ações HTML
      if (htmlContent && request.actions && request.actions.length > 0) {
        const result = processHtmlActions(htmlContent, request.actions)
        htmlContent = result.html
        modifications = result.modifications
      }
      
      // Preparar dados para MCP Gmail
      const emailData = {
        to: Array.isArray(request.to) ? request.to : [request.to],
        subject: request.subject,
        html: htmlContent,
        text: textContent,
        attachments: request.attachments
      }
      
      // Enviar email
      const sendResult = await sendEmailViaMCP(emailData)
      
      if (sendResult.error) {
        throw new Error(sendResult.error)
      }
      
      // Log de sucesso
      await supabase.from('email_logs').insert({
        message_id: sendResult.messageId,
        to: emailData.to,
        subject: emailData.subject,
        complexity,
        processing_time: Date.now() - startTime,
        modifications,
        status: 'sent'
      })
      
      clearTimeout(timeoutId)
      
      return new Response(
        JSON.stringify({
          success: true,
          messageId: sendResult.messageId,
          processingTime: Date.now() - startTime,
          htmlModifications: modifications
        } as EmailResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
      
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        throw new Error(`Timeout after ${timeout} seconds`)
      }
      throw error
    }
    
  } catch (error) {
    // Log de erro
    try {
      const authHeader = req.headers.get('Authorization')!
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      
      await supabase.from('email_logs').insert({
        error: error.message,
        processing_time: Date.now() - startTime,
        status: 'failed'
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      } as EmailResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

})

/* ===== DOCUMENTAÇÃO DA EMAIL AUTOMATION ENGINE ===== 

IMPORTANTE: Esta função NÃO entende linguagem natural!
❌ NÃO FUNCIONA: { "instruction": "mande email para valdair" }
✅ FUNCIONA: { "to": "valdair@email.com", "subject": "Olá", "html": "<p>Oi</p>" }

===== CONFIGURAÇÃO NECESSÁRIA =====

1. CONFIGURAR VARIÁVEIS DE AMBIENTE NO SUPABASE:
   
   No Supabase Dashboard:
   - Vá em Settings > Edge Functions > Secrets
   - Adicione as variáveis:
     * MCP_GMAIL_URL = "http://173.249.22.2:3000"
     * MCP_GMAIL_API_KEY = "sua-chave-api"
   
   OU via CLI:
   supabase secrets set MCP_GMAIL_URL="http://173.249.22.2:3000"
   supabase secrets set MCP_GMAIL_API_KEY="sua-api-key"

2. DEPLOY DA FUNÇÃO:
   supabase functions deploy email-automation-engine --no-verify-jwt

===== EXEMPLOS DE USO NO PAINEL DO SUPABASE ===== */

/*
TESTE 1 - Email Simples (30s timeout):
{
  "to": "usuario@example.com",
  "subject": "Bem-vindo ao Liftlio!",
  "text": "Olá! Seja bem-vindo.",
  "html": "<h1>Olá!</h1><p>Seja bem-vindo ao Liftlio.</p>",
  "complexity": "simple"
}

TESTE 2 - Email com Template e Variáveis (120s timeout):
{
  "to": ["user1@example.com", "user2@example.com"],
  "subject": "Relatório Semanal",
  "templateId": "weekly-report",
  "variables": {
    "userName": "João Silva",
    "videosAnalyzed": 1234,
    "avgSentiment": "85% Positivo",
    "weekDate": "24/07/2025"
  },
  "complexity": "medium"
}

TESTE 3 - Email com Modificações HTML (400s timeout):
{
  "to": "admin@liftlio.com",
  "subject": "Promoção Especial",
  "html": "<div class='container'><h1 class='title'>Título</h1><p class='price'>R$ 0,00</p><div class='footer'>Footer</div></div>",
  "actions": [
    {
      "type": "replace",
      "selector": ".title",
      "content": "🎉 OFERTA IMPERDÍVEL!"
    },
    {
      "type": "replace",
      "selector": ".price",
      "content": "<strong style='color: red; font-size: 32px;'>R$ 99,90</strong>"
    },
    {
      "type": "addClass",
      "selector": ".container",
      "value": "promo-special"
    },
    {
      "type": "addStyle",
      "selector": ".container",
      "value": "background: linear-gradient(45deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px;"
    },
    {
      "type": "append",
      "selector": ".footer",
      "content": "<p style='font-size: 12px;'>Válido até 31/07/2025</p>"
    }
  ],
  "complexity": "complex"
}

TESTE 4 - Email com Anexos:
{
  "to": "finance@company.com",
  "subject": "Relatório Financeiro - Julho 2025",
  "html": "<p>Prezado(a),</p><p>Segue em anexo o relatório financeiro.</p>",
  "attachments": [
    {
      "filename": "relatorio_julho_2025.pdf",
      "content": "JVBERi0xLjQKJe...", 
      "encoding": "base64"
    }
  ],
  "complexity": "complex"
}

TESTE 5 - Detecção Automática de Complexidade:
{
  "to": "test@liftlio.com",
  "subject": "Teste Auto-Complexidade",
  "html": "<div><h1>Teste</h1><p class='content'>Conteúdo aqui</p></div>",
  "variables": {
    "teste": "valor"
  },
  "actions": [
    { "type": "addClass", "selector": "h1", "value": "highlight" },
    { "type": "replace", "selector": ".content", "content": "Novo conteúdo" }
  ],
  "complexity": "auto"
}
// Será detectado como "medium" (score = 5)

===== RESPOSTA ESPERADA =====

SUCESSO:
{
  "success": true,
  "messageId": "msg_abc123xyz",
  "processingTime": 1234,
  "htmlModifications": 5
}

ERRO:
{
  "success": false,
  "error": "Template not found",
  "processingTime": 567
}

===== AÇÕES HTML DISPONÍVEIS =====

1. REPLACE - Substitui conteúdo:
   { "type": "replace", "selector": ".price", "content": "<strong>R$ 99</strong>" }

2. APPEND - Adiciona ao final:
   { "type": "append", "selector": ".footer", "content": "<p>Novo texto</p>" }

3. PREPEND - Adiciona no início:
   { "type": "prepend", "selector": ".header", "content": "<div>Alerta!</div>" }

4. REMOVE - Remove elementos:
   { "type": "remove", "selector": ".ads" }

5. ADDCLASS - Adiciona classe CSS:
   { "type": "addClass", "selector": "button", "value": "btn-primary" }

6. ADDSTYLE - Adiciona estilos inline:
   { "type": "addStyle", "selector": ".box", "value": "color: red; font-weight: bold;" }

===== SISTEMA DE COMPLEXIDADE =====

PONTUAÇÃO:
- Cada ação HTML: +2 pontos
- Cada anexo: +3 pontos
- Tem template: +2 pontos
- Tem variáveis: +1 ponto

TIMEOUTS:
- Score < 3: SIMPLE (30s)
- Score 3-7: MEDIUM (120s)
- Score >= 8: COMPLEX (400s / 6.6min)

===== INTEGRAÇÃO COM TRIGGERS =====

EXEMPLO - Email de boas-vindas automático:

CREATE OR REPLACE FUNCTION send_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://suqjifkhmekcdflwowiw.supabase.co/functions/v1/email-automation-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := jsonb_build_object(
      'to', NEW.email,
      'templateId', 'welcome-email',
      'variables', jsonb_build_object(
        'userName', NEW.name,
        'activationLink', 'https://liftlio.com/activate/' || NEW.id
      ),
      'complexity', 'medium'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_user_signup
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION send_welcome_email();

===== TEMPLATES DE EXEMPLO =====

Os templates devem ser inseridos na tabela email_templates:

INSERT INTO email_templates (name, subject, html_content, variables)
VALUES (
  'welcome-email',
  'Bem-vindo ao Liftlio, {{userName}}!',
  '<html><body>
    <h1>Olá {{userName}}!</h1>
    <p>Bem-vindo ao Liftlio!</p>
    <a href="{{activationLink}}">Ativar Conta</a>
  </body></html>',
  '["userName", "activationLink"]'::jsonb
);

===== MONITORAMENTO =====

-- Ver emails enviados hoje
SELECT * FROM email_logs 
WHERE created_at >= CURRENT_DATE 
AND status = 'sent'
ORDER BY created_at DESC;

-- Taxa de sucesso por complexidade
SELECT 
  complexity,
  COUNT(*) FILTER (WHERE status = 'sent') as enviados,
  COUNT(*) FILTER (WHERE status = 'failed') as falhados,
  ROUND(AVG(processing_time)) as tempo_medio_ms
FROM email_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY complexity;

*/