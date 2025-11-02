import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import DOMPurify from 'https://esm.sh/isomorphic-dompurify@2.15.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Configuração de timeouts dinâmicos (em segundos)
const TIMEOUTS = {
  simple: 30,
  medium: 120,
  complex: 400
};
// MCP Gmail Configuration
const MCP_GMAIL_URL = Deno.env.get('MCP_GMAIL_URL') || 'http://173.249.22.2:3000';
const MCP_GMAIL_KEY = Deno.env.get('MCP_GMAIL_API_KEY') || '';
// Determinar complexidade automaticamente
function determineComplexity(request) {
  const actionCount = request.actions?.length || 0;
  const attachmentCount = request.attachments?.length || 0;
  const hasTemplate = !!request.templateId;
  const hasVariables = request.variables && Object.keys(request.variables).length > 0;
  // Pontuação de complexidade
  let score = 0;
  score += actionCount * 2;
  score += attachmentCount * 3;
  score += hasTemplate ? 2 : 0;
  score += hasVariables ? 1 : 0;
  if (score >= 8) return 'complex';
  if (score >= 3) return 'medium';
  return 'simple';
}
// Processar ações de HTML
function processHtmlActions(html, actions) {
  let modifiedHtml = html;
  let modifications = 0;
  // Parse HTML com DOMPurify para segurança
  const clean = DOMPurify.sanitize(html, {
    WHOLE_DOCUMENT: true,
    RETURN_DOM: false,
    ADD_TAGS: [
      'style'
    ],
    ADD_ATTR: [
      'style',
      'class'
    ]
  });
  // Criar um parser HTML simples para manipulação
  const parser = new DOMParser();
  const doc = parser.parseFromString(clean, 'text/html');
  for (const action of actions){
    try {
      switch(action.type){
        case 'replace':
          if (action.selector && action.content) {
            const elements = doc.querySelectorAll(action.selector);
            elements.forEach((el)=>{
              el.innerHTML = DOMPurify.sanitize(action.content);
              modifications++;
            });
          }
          break;
        case 'append':
          if (action.selector && action.content) {
            const elements = doc.querySelectorAll(action.selector);
            elements.forEach((el)=>{
              el.innerHTML += DOMPurify.sanitize(action.content);
              modifications++;
            });
          }
          break;
        case 'prepend':
          if (action.selector && action.content) {
            const elements = doc.querySelectorAll(action.selector);
            elements.forEach((el)=>{
              el.innerHTML = DOMPurify.sanitize(action.content) + el.innerHTML;
              modifications++;
            });
          }
          break;
        case 'remove':
          if (action.selector) {
            const elements = doc.querySelectorAll(action.selector);
            elements.forEach((el)=>{
              el.remove();
              modifications++;
            });
          }
          break;
        case 'addClass':
          if (action.selector && action.value) {
            const elements = doc.querySelectorAll(action.selector);
            elements.forEach((el)=>{
              el.classList.add(action.value);
              modifications++;
            });
          }
          break;
        case 'addStyle':
          if (action.selector && action.value) {
            const elements = doc.querySelectorAll(action.selector);
            elements.forEach((el)=>{
              el.style.cssText += action.value;
              modifications++;
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error processing action:', action, error);
    }
  }
  return {
    html: doc.documentElement.outerHTML,
    modifications
  };
}
// Substituir variáveis no template
function replaceTemplateVariables(content, variables) {
  let processedContent = content;
  // Substituir variáveis no formato {{variavel}}
  Object.entries(variables).forEach(([key, value])=>{
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    processedContent = processedContent.replace(regex, String(value));
  });
  // Substituir variáveis no formato ${variavel}
  Object.entries(variables).forEach(([key, value])=>{
    const regex = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'g');
    processedContent = processedContent.replace(regex, String(value));
  });
  return processedContent;
}
// Buscar template do banco de dados
async function fetchTemplate(supabase, templateId) {
  const { data, error } = await supabase.from('email_templates').select('html_content, text_content, subject').eq('id', templateId).single();
  if (error || !data) {
    throw new Error(`Template ${templateId} not found`);
  }
  return {
    html: data.html_content,
    text: data.text_content,
    subject: data.subject
  };
}
// Enviar email via MCP Gmail
async function sendEmailViaMCP(emailData) {
  try {
    const response = await fetch(`${MCP_GMAIL_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MCP_GMAIL_KEY}`
      },
      body: JSON.stringify(emailData)
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        error: result.error || 'Failed to send email'
      };
    }
    return {
      messageId: result.messageId
    };
  } catch (error) {
    return {
      error: `MCP Gmail error: ${error.message}`
    };
  }
}
Deno.serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  const startTime = Date.now();
  try {
    // Parse request
    const request = await req.json();
    // Initialize Supabase client
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    // Determinar complexidade e timeout
    const complexity = request.complexity === 'auto' ? determineComplexity(request) : request.complexity || 'simple';
    const timeout = TIMEOUTS[complexity];
    // Configurar AbortController para timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(()=>controller.abort(), timeout * 1000);
    try {
      // Preparar conteúdo do email
      let htmlContent = request.html;
      let textContent = request.text;
      let subjectContent = request.subject;
      let modifications = 0;
      // Buscar template se especificado
      if (request.templateId) {
        const template = await fetchTemplate(supabase, request.templateId);
        htmlContent = template.html || htmlContent;
        textContent = template.text || textContent;
        subjectContent = template.subject || subjectContent;
      }
      // Substituir variáveis
      if (request.variables) {
        if (htmlContent) {
          htmlContent = replaceTemplateVariables(htmlContent, request.variables);
        }
        if (textContent) {
          textContent = replaceTemplateVariables(textContent, request.variables);
        }
        if (subjectContent) {
          subjectContent = replaceTemplateVariables(subjectContent, request.variables);
        }
      }
      // Processar ações HTML
      if (htmlContent && request.actions && request.actions.length > 0) {
        const result = processHtmlActions(htmlContent, request.actions);
        htmlContent = result.html;
        modifications = result.modifications;
      }
      // Preparar dados para MCP Gmail
      const emailData = {
        to: Array.isArray(request.to) ? request.to : [
          request.to
        ],
        subject: subjectContent,
        html: htmlContent,
        text: textContent,
        attachments: request.attachments
      };
      // Enviar email
      const sendResult = await sendEmailViaMCP(emailData);
      if (sendResult.error) {
        throw new Error(sendResult.error);
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
      });
      clearTimeout(timeoutId);
      return new Response(JSON.stringify({
        success: true,
        messageId: sendResult.messageId,
        processingTime: Date.now() - startTime,
        htmlModifications: modifications
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Timeout after ${timeout} seconds`);
      }
      throw error;
    }
  } catch (error) {
    // Log de erro
    try {
      const authHeader = req.headers.get('Authorization');
      const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      });
      await supabase.from('email_logs').insert({
        error: error.message,
        processing_time: Date.now() - startTime,
        status: 'failed'
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      processingTime: Date.now() - startTime
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});