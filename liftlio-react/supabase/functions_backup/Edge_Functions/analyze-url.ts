import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
console.log('URL Analyzer Edge Function started');
// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};
// API Keys from environment
const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
const JINA_API_KEY = Deno.env.get('JINA_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Criar cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Configurações de rate limiting
const RATE_LIMIT_MAX_REQUESTS = 3;
const RATE_LIMIT_WINDOW_HOURS = 24;
// IPs que são considerados localhost/desenvolvimento
const LOCALHOST_IPS = [
  '127.0.0.1',
  'localhost',
  '::1',
  '0.0.0.0',
  '::ffff:127.0.0.1'
];
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: corsHeaders
    });
  }
  try {
    // Verificar se as chaves API estão configuradas
    if (!CLAUDE_API_KEY) {
      throw new Error('CLAUDE_API_KEY is not configured');
    }
    // Parse the request body
    const { url, language = 'pt', additionalContent, ip } = await req.json();
    // Validar entrada - pelo menos URL ou additionalContent deve ser fornecido
    if (!url && !additionalContent) {
      throw new Error('URL or additional content is required');
    }
    // Se URL fornecida, validar formato
    if (url) {
      try {
        new URL(url);
      } catch  {
        throw new Error('Invalid URL format');
      }
    }
    // Verificar se é localhost/desenvolvimento
    const isLocalhost = ip && (LOCALHOST_IPS.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('172.17.') || ip.startsWith('172.18.') || ip.startsWith('172.19.') || ip.startsWith('172.20.') || ip.startsWith('172.21.') || ip.startsWith('172.22.') || ip.startsWith('172.23.') || ip.startsWith('172.24.') || ip.startsWith('172.25.') || ip.startsWith('172.26.') || ip.startsWith('172.27.') || ip.startsWith('172.28.') || ip.startsWith('172.29.') || ip.startsWith('172.30.') || ip.startsWith('172.31.'));
    console.log('Request details:', {
      url: url || 'No URL provided',
      language: language,
      hasAdditionalContent: !!additionalContent,
      ip: ip || 'No IP provided',
      isLocalhost: isLocalhost
    });
    // Variáveis para controle de rate limit
    let rateLimitCheck = {
      allowed: true,
      count: 0
    };
    // Aplicar rate limiting apenas se não for localhost
    if (!isLocalhost) {
      // Validar IP
      if (!ip) {
        throw new Error('IP address is required for production requests');
      }
      // Validar formato do IP (básico)
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
      if (!ipRegex.test(ip) && !ipv6Regex.test(ip)) {
        throw new Error('Invalid IP address format');
      }
      // Verificar rate limiting
      rateLimitCheck = await checkRateLimit(ip);
      if (!rateLimitCheck.allowed) {
        console.log(`Rate limit exceeded for IP ${ip}: ${rateLimitCheck.count}/${RATE_LIMIT_MAX_REQUESTS} requests in last ${RATE_LIMIT_WINDOW_HOURS}h`);
        return new Response(JSON.stringify({
          success: false,
          error: 'Rate limit exceeded',
          message: `Você excedeu o limite de ${RATE_LIMIT_MAX_REQUESTS} consultas por dia. Tente novamente em ${rateLimitCheck.hoursUntilReset} horas.`,
          details: {
            requestsUsed: rateLimitCheck.count,
            maxRequests: RATE_LIMIT_MAX_REQUESTS,
            hoursUntilReset: rateLimitCheck.hoursUntilReset,
            nextResetTime: rateLimitCheck.nextResetTime
          }
        }), {
          status: 429,
          headers: {
            ...corsHeaders,
            'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.nextResetTime
          }
        });
      }
      // Registrar nova requisição (apenas se não for localhost)
      await recordRequest(ip);
      console.log(`Rate limit OK for IP ${ip}: ${rateLimitCheck.count + 1}/${RATE_LIMIT_MAX_REQUESTS} requests`);
    } else {
      console.log('Localhost/development request - rate limiting disabled');
    }
    // Continuar com o processamento normal...
    let scrapedContent = '';
    let finalUrl = url || 'User provided content';
    // Step 1: Scrape website if URL is provided
    if (url) {
      // Verificar JINA_API_KEY apenas se for fazer scraping
      if (!JINA_API_KEY) {
        throw new Error('JINA_API_KEY is not configured but is required for URL scraping');
      }
      console.log('Step 1: Scraping website with Jina AI...');
      const jinaUrl = `https://r.jina.ai/${url}`;
      console.log('Calling Jina:', jinaUrl);
      const jinaResponse = await fetch(jinaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${JINA_API_KEY}`,
          'Accept': 'application/json',
          'X-Return-Format': 'text'
        }
      });
      console.log('Jina response status:', jinaResponse.status);
      if (!jinaResponse.ok) {
        const errorText = await jinaResponse.text();
        console.error('Jina AI error:', jinaResponse.status, errorText);
        // Se falhar o scraping mas temos conteúdo adicional, continuar
        if (additionalContent) {
          console.log('Jina scraping failed, but using additional content');
          scrapedContent = '';
        } else {
          throw new Error(`Jina AI error (${jinaResponse.status}): ${errorText}`);
        }
      } else {
        // Get the scraped content
        scrapedContent = await jinaResponse.text();
        if (!scrapedContent || scrapedContent.length < 100) {
          if (!additionalContent) {
            throw new Error('Unable to scrape website content and no additional content provided');
          }
          scrapedContent = '';
        }
        console.log('Website scraped successfully, content length:', scrapedContent.length);
        // Verify we got real content (not an error page)
        if (scrapedContent.includes('error') && scrapedContent.includes('404')) {
          if (!additionalContent) {
            throw new Error('Website returned 404 or error page');
          }
          scrapedContent = '';
        }
        // Log first part of content for debugging
        console.log('Content preview:', scrapedContent.substring(0, 300).replace(/\s+/g, ' '));
      }
    }
    // Combinar conteúdo scrapeado com conteúdo adicional
    let finalContent = '';
    if (scrapedContent && additionalContent) {
      finalContent = `${scrapedContent}\n\nAdditional Information:\n${additionalContent}`;
      console.log('Using both scraped and additional content');
    } else if (scrapedContent) {
      finalContent = scrapedContent;
      console.log('Using only scraped content');
    } else if (additionalContent) {
      finalContent = additionalContent;
      console.log('Using only additional content');
    } else {
      throw new Error('No content available to analyze');
    }
    console.log('Final content length:', finalContent.length);
    // Step 2: Generate complete simulation with Claude
    console.log('Step 2: Generating complete simulation with Claude...');
    // Detect main language of the content
    const contentLanguage = detectLanguage(finalContent);
    console.log('Content language detected:', contentLanguage, 'but will respond in:', language);
    // Extract key information from the content
    const siteInfo = extractSiteInfo(finalContent);
    // Log what was extracted
    console.log('Extracted site info:', siteInfo);
    // Garantir que temos informações mínimas
    if (!siteInfo.productName) {
      siteInfo.productName = 'produto';
    }
    // Generate dynamic numbers
    const numbers = generateDynamicNumbers(language, siteInfo.topic);
    // Criar prompt baseado no idioma SOLICITADO
    const systemPrompt = `You are a JSON generator for Liftlio marketing simulations. You MUST analyze the actual content provided and create a simulation that is DIRECTLY RELATED to that specific product/service.

CRITICAL RULES for liftlio_response:
- Be a GENUINE user sharing personal experience
- NEVER mention sending DMs, private messages, or trying to make contact
- NEVER sound like you're selling or overly interested
- Just share helpful experience naturally, like "I've been using X for Y and it really helps with Z"
- Keep it casual and authentic
- Maximum 2 sentences
- DO NOT reference any video timestamp or video content
- Write as if responding directly to the comment, not referring to a video

IMPORTANT: The ENTIRE response must be in ${language === 'pt' ? 'PORTUGUESE (Brazilian Portuguese)' : 'ENGLISH'}. This includes:
- Video title
- Channel name
- Lead comment author name (use ${language === 'pt' ? 'Brazilian' : 'American'} names)
- Lead comment text
- Liftlio response message
- ALL text content

Return ONLY valid JSON.`;
    const userPrompt = `Analyze this content and create a Liftlio simulation:

CONTENT (first 2000 chars):
${finalContent.substring(0, 2000)}

Based on the content above, identify:
- What is the main product/service?
- What is it about?
- What are the key features/benefits mentioned?

Create a realistic YouTube video simulation where someone would be discussing THIS SPECIFIC product/service.

${url ? `The website URL is: ${url}` : 'No URL provided - using provided content only'}
Product/Company name: ${siteInfo.productName || 'Not detected - extract from content'}
Topic category: ${siteInfo.topic}
Key benefits found: ${siteInfo.benefits.join(', ')}

IMPORTANT:
1. The video title, comment, and response MUST be specifically about what this content describes
2. ALL content must be in ${language === 'pt' ? 'PORTUGUESE' : 'ENGLISH'}
3. Use ${language === 'pt' ? 'Brazilian Portuguese expressions and names' : 'American English expressions and names'}
4. The liftlio_response should NOT mention timestamps or refer to the video

Examples for language:
${language === 'pt' ? `
- Video title: "Como [fazer algo] com [produto] em 2024"
- Author names: João Silva, Maria Santos, Carlos Oliveira, Ana Costa
- Comment: "Estou precisando de [solução]. O [produto] funciona bem para [caso]?"
- Response: "Uso o [produto] há [período] e [benefício]. Realmente ajuda com [problema específico]."
` : `
- Video title: "How to [do something] with [product] in 2024"
- Author names: John Smith, Sarah Johnson, Michael Brown, Emily Davis
- Comment: "I need [solution]. Does [product] work well for [case]?"
- Response: "I've been using [product] for [period] and [benefit]. It really helps with [specific problem]."
`}

CRITICAL for liftlio_response:
- Write as a REAL user sharing genuine experience
- NEVER mention DMs, contact, or selling
- Just share helpful personal experience naturally
- Use time period: ${numbers.timeUsing}
- DO NOT use timestamp or refer to video content

Return this exact JSON structure with these EXACT numbers:
{
  "video": {
    "title": "[YouTube video title in ${language === 'pt' ? 'PORTUGUESE' : 'ENGLISH'} about THIS product/service]",
    "channel": "${numbers.channelName}",
    "views": ${numbers.views},
    "comments": ${numbers.comments},
    "engagement_potential": "High",
    "category": "${siteInfo.category}"
  },
  "lead_comment": {
    "author": "[${language === 'pt' ? 'Brazilian' : 'American'} name]",
    "text": "[Question in ${language === 'pt' ? 'PORTUGUESE' : 'ENGLISH'} specifically about THIS product/service]",
    "lead_score": ${numbers.leadScore},
    "sentiment": "seeking_solution",
    "justification": "User expressing specific pain point"
  },
  "liftlio_response": {
    "message": "[Natural response in ${language === 'pt' ? 'PORTUGUESE' : 'ENGLISH'} like: '${language === 'pt' ? `Uso o [produto] há ${numbers.timeUsing} e [benefício específico]. Realmente resolve [problema].` : `I've been using [product] for ${numbers.timeUsing} and it [specific benefit]. Really solves [problem].`}' MAX 2 SENTENCES!]",
    "sentiment_score": ${numbers.sentimentScore},
    "relevance_score": ${numbers.relevanceScore},
    "justification": "Shared genuine experience with product"
  }
}`;
    console.log('Calling Claude API with requested language:', language);
    const claudePayload = {
      model: 'claude-3-5-sonnet-20241022',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            }
          ]
        }
      ],
      system: systemPrompt,
      max_tokens: 1024,
      temperature: 0.7
    };
    console.log('Claude payload preview:', {
      model: claudePayload.model,
      promptLength: userPrompt.length,
      systemLength: systemPrompt.length,
      requestedLanguage: language
    });
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(claudePayload)
    });
    console.log('Claude response status:', claudeResponse.status);
    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API full error:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch  {
        errorData = {
          error: {
            message: errorText
          }
        };
      }
      throw new Error(`Claude API error (${claudeResponse.status}): ${errorData.error?.message || errorText}`);
    }
    const claudeData = await claudeResponse.json();
    console.log('Claude response structure:', {
      hasContent: !!claudeData.content,
      contentLength: claudeData.content?.length,
      firstContentType: claudeData.content?.[0]?.type
    });
    // Extract the text response
    const responseText = claudeData.content?.[0]?.text || '{}';
    // Parse JSON from Claude response
    let simulation;
    try {
      // Remove any markdown formatting if present
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      simulation = JSON.parse(cleanedResponse);
      // Validar estrutura mínima
      if (!simulation.video || !simulation.lead_comment || !simulation.liftlio_response) {
        throw new Error('Invalid simulation structure');
      }
      // Validar que a simulação está relacionada ao conteúdo
      const simulationText = JSON.stringify(simulation).toLowerCase();
      const hasRelevantContent = siteInfo.productName && simulationText.includes(siteInfo.productName.toLowerCase()) || url && simulationText.includes(url.replace('https://', '').replace('www.', '').split('/')[0]);
      if (!hasRelevantContent && siteInfo.productName && url) {
        console.warn('Simulation may not be related to the actual content');
      }
    } catch (e) {
      console.error('Error parsing JSON:', e, 'Response:', responseText.substring(0, 200));
      throw new Error('Invalid response format from AI');
    }
    // Preparar headers de resposta
    const responseHeaders = {
      ...corsHeaders
    };
    // Adicionar headers de rate limit apenas se não for localhost
    if (!isLocalhost) {
      responseHeaders['X-RateLimit-Limit'] = RATE_LIMIT_MAX_REQUESTS.toString();
      responseHeaders['X-RateLimit-Remaining'] = (RATE_LIMIT_MAX_REQUESTS - rateLimitCheck.count - 1).toString();
      responseHeaders['X-RateLimit-Reset'] = rateLimitCheck.nextResetTime || '';
    }
    // Return the complete simulation
    return new Response(JSON.stringify({
      success: true,
      url: url || null,
      language: language,
      contentLanguage: contentLanguage,
      contentSource: url ? additionalContent ? 'both' : 'scraped' : 'provided',
      simulation: simulation,
      productInfo: {
        productName: siteInfo.productName,
        topic: siteInfo.topic,
        category: siteInfo.category
      },
      // Incluir info de desenvolvimento se for localhost
      ...isLocalhost && {
        developmentMode: true,
        message: 'Running in development mode - rate limiting disabled'
      }
    }), {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Error:', error.message, error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: error.message.includes('Rate limit') ? 429 : 500,
      headers: corsHeaders
    });
  }
});
// Função para verificar rate limiting
async function checkRateLimit(ip) {
  try {
    // Calcular timestamp de 24 horas atrás
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - RATE_LIMIT_WINDOW_HOURS);
    // Buscar requisições do IP nas últimas 24 horas
    const { data, error } = await supabase.from('url_analyzer_rate_limit').select('request_timestamp').eq('ip_address', ip).gte('request_timestamp', windowStart.toISOString()).order('request_timestamp', {
      ascending: false
    });
    if (error) {
      console.error('Error checking rate limit:', error);
      // Em caso de erro, permitir a requisição
      return {
        allowed: true,
        count: 0
      };
    }
    const requestCount = data ? data.length : 0;
    // Se não há requisições ou menos que o limite
    if (requestCount < RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: true,
        count: requestCount,
        nextResetTime: calculateNextResetTime(data)
      };
    }
    // Se excedeu o limite, calcular quando poderá fazer nova requisição
    const oldestRequest = data[data.length - 1];
    const oldestRequestTime = new Date(oldestRequest.request_timestamp);
    const nextAvailableTime = new Date(oldestRequestTime);
    nextAvailableTime.setHours(nextAvailableTime.getHours() + RATE_LIMIT_WINDOW_HOURS);
    const hoursUntilReset = Math.ceil((nextAvailableTime - new Date()) / (1000 * 60 * 60));
    return {
      allowed: false,
      count: requestCount,
      hoursUntilReset: hoursUntilReset,
      nextResetTime: nextAvailableTime.toISOString()
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Em caso de erro, permitir a requisição
    return {
      allowed: true,
      count: 0
    };
  }
}
// Função para registrar nova requisição
async function recordRequest(ip) {
  try {
    const { error } = await supabase.from('url_analyzer_rate_limit').insert([
      {
        ip_address: ip
      }
    ]);
    if (error) {
      console.error('Error recording request:', error);
    // Não bloquear a requisição se houver erro ao registrar
    }
  } catch (error) {
    console.error('Record request error:', error);
  }
}
// Função auxiliar para calcular próximo reset
function calculateNextResetTime(requests) {
  if (!requests || requests.length === 0) {
    const nextReset = new Date();
    nextReset.setHours(nextReset.getHours() + RATE_LIMIT_WINDOW_HOURS);
    return nextReset.toISOString();
  }
  // Pegar a requisição mais antiga
  const oldestRequest = requests[requests.length - 1];
  const resetTime = new Date(oldestRequest.request_timestamp);
  resetTime.setHours(resetTime.getHours() + RATE_LIMIT_WINDOW_HOURS);
  return resetTime.toISOString();
}
// Helper function to generate dynamic channel names
function generateChannelName(topic, language) {
  const channels = {
    'pagamentos e finanças': {
      pt: [
        'Tech Pagamentos BR',
        'Fintech Brasil',
        'Dev Commerce',
        'Pagamentos Digitais',
        'Finanças Tech'
      ],
      en: [
        'Payment Tech',
        'Fintech Explained',
        'Commerce Dev',
        'Digital Payments',
        'Finance Tech'
      ]
    },
    'IA e automação': {
      pt: [
        'IA Brasil Tech',
        'Automação Digital',
        'Tech IA',
        'Inteligência Artificial BR',
        'IA Prática'
      ],
      en: [
        'AI Explained',
        'Tech Automation',
        'AI Tools Review',
        'Machine Learning Hub',
        'AI Practical'
      ]
    },
    'marketing digital': {
      pt: [
        'Marketing Digital BR',
        'Growth Hacks Brasil',
        'Digital Marketing Pro',
        'Marketing Tech',
        'Estratégias Digitais'
      ],
      en: [
        'Digital Marketing Pro',
        'Growth Hacking',
        'Marketing Tools',
        'Marketing Mastery',
        'Digital Strategies'
      ]
    },
    'produtividade': {
      pt: [
        'Produtividade Tech',
        'Organização Digital',
        'Produtividade BR',
        'Tech Tools Brasil',
        'Eficiência Digital'
      ],
      en: [
        'Productivity Pro',
        'Digital Organization',
        'Productivity Tools',
        'Tech Efficiency',
        'Work Smarter'
      ]
    },
    'análise de dados': {
      pt: [
        'Data Science BR',
        'Analytics Brasil',
        'Tech Analytics',
        'Dados e Insights',
        'Análise Digital'
      ],
      en: [
        'Data Science Hub',
        'Analytics Pro',
        'Tech Analytics',
        'Data Insights',
        'Digital Analysis'
      ]
    },
    'tecnologia': {
      pt: [
        'Tech Review Brasil',
        'Inovação Digital',
        'Tech Insider BR',
        'Tecnologia Prática',
        'Digital Pro BR'
      ],
      en: [
        'Tech Review',
        'Digital Innovation',
        'Tech Insider',
        'Practical Tech',
        'Digital Pro'
      ]
    }
  };
  const defaultChannels = {
    pt: [
      'Tech Brasil',
      'Digital Pro BR',
      'Tech Review Brasil',
      'Inovação Digital'
    ],
    en: [
      'Tech Review',
      'Digital Pro',
      'Tech Insights',
      'Innovation Hub'
    ]
  };
  const channelList = channels[topic]?.[language] || defaultChannels[language] || defaultChannels['en'];
  return channelList[Math.floor(Math.random() * channelList.length)];
}
// Helper function to generate dynamic numbers
function generateDynamicNumbers(language = 'en', topic = 'tecnologia') {
  // Generate realistic random numbers
  const views = Math.floor(Math.random() * (500000 - 5000) + 5000);
  const comments = Math.floor(Math.random() * (500 - 50) + 50);
  const leadScore = Math.floor(Math.random() * 3) + 7; // 7-9
  const sentimentScore = (Math.random() * 0.15 + 0.8).toFixed(2); // 0.80-0.95
  const relevanceScore = (Math.random() * 0.10 + 0.85).toFixed(2); // 0.85-0.95
  // Generate time using product based on REQUESTED language
  const timeAmount = Math.floor(Math.random() * 5) + 1; // 1-5
  const timeUnit = language === 'pt' ? timeAmount === 1 ? 'ano' : 'anos' : timeAmount === 1 ? 'year' : 'years';
  // Sometimes use months instead of years
  const useMonths = Math.random() > 0.5;
  if (useMonths) {
    const monthAmount = Math.floor(Math.random() * 11) + 1; // 1-11 months
    const monthUnit = language === 'pt' ? monthAmount === 1 ? 'mês' : 'meses' : monthAmount === 1 ? 'month' : 'months';
    return {
      views,
      comments,
      leadScore,
      sentimentScore: parseFloat(sentimentScore),
      relevanceScore: parseFloat(relevanceScore),
      timeUsing: `${monthAmount} ${monthUnit}`,
      channelName: generateChannelName(topic, language)
    };
  }
  // Sometimes use weeks for newer products
  const useWeeks = Math.random() > 0.7 && timeAmount === 1;
  if (useWeeks) {
    const weekAmount = Math.floor(Math.random() * 4) + 1; // 1-4 weeks
    const weekUnit = language === 'pt' ? weekAmount === 1 ? 'semana' : 'semanas' : weekAmount === 1 ? 'week' : 'weeks';
    return {
      views,
      comments,
      leadScore,
      sentimentScore: parseFloat(sentimentScore),
      relevanceScore: parseFloat(relevanceScore),
      timeUsing: `${weekAmount} ${weekUnit}`,
      channelName: generateChannelName(topic, language)
    };
  }
  return {
    views,
    comments,
    leadScore,
    sentimentScore: parseFloat(sentimentScore),
    relevanceScore: parseFloat(relevanceScore),
    timeUsing: `${timeAmount} ${timeUnit}`,
    channelName: generateChannelName(topic, language)
  };
}
// Helper function to detect language
function detectLanguage(content) {
  if (!content || content.length < 100) {
    return 'en'; // Default fallback
  }
  // Convert to lowercase for better matching
  const lowerContent = content.toLowerCase();
  // Simple detection based on common Portuguese words
  const portugueseWords = /\b(você|para|com|sem|mais|muito|quando|como|fazer|nosso|nossa|pelo|pela|desta|deste|isso|esses|estas|estes|também|já|ainda|sempre|agora|depois|antes|melhor|maior|menor|novo|nova|bom|boa|tudo|nada|algum|alguma|outro|outra|mesmo|mesma|cada|vários|várias|poucos|poucas|muitos|muitas|está|estão|será|serão|foi|foram|seja|sejam|português|brasil)\b/gi;
  const matches = lowerContent.match(portugueseWords);
  const matchCount = matches ? matches.length : 0;
  // Calculate percentage of Portuguese words
  const wordCount = lowerContent.split(/\s+/).length;
  const portuguesePercentage = matchCount / wordCount * 100;
  return portuguesePercentage > 5 ? 'pt' : 'en';
}
// Extract site information
function extractSiteInfo(content) {
  const info = {
    productName: null,
    topic: 'tecnologia',
    category: 'Business Tools',
    benefits: []
  };
  // Clean content
  const cleanContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const lowerContent = cleanContent.toLowerCase();
  // Extract product/company name - try multiple strategies
  // 1. From title tag
  const titleMatch = content.match(/<title>([^<\-|]+)/i);
  if (titleMatch) {
    const titleText = titleMatch[1].trim();
    // Extract first significant word/phrase
    const words = titleText.split(/\s+/);
    if (words.length > 0) {
      // If it's a known company/product name pattern
      if (titleText.match(/^(Claude|Anthropic|Stripe|Notion|OpenAI|Mailchimp|Liftlio)/i)) {
        info.productName = titleText.match(/^([\w\s]+?)(?:\s*[-–—|]|\s+is\s+|\s+helps\s+|$)/i)?.[1]?.trim();
      } else {
        info.productName = words.slice(0, 2).join(' ');
      }
    }
  }
  // 2. Look for product names in content
  if (!info.productName) {
    // Common patterns for product/company names
    const productPatterns = [
      // "Claude is an AI assistant"
      /\b([\w]+(?:\s+[\w]+)?)\s+is\s+(?:an?\s+)?[\w\s]+(?:assistant|platform|tool|service|product)/i,
      // "Welcome to X"
      /welcome\s+to\s+([\w]+(?:\s+[\w]+)?)/i,
      // "X helps you"
      /\b([\w]+(?:\s+[\w]+)?)\s+helps?\s+you/i,
      // "Introducing X"
      /introducing\s+([\w]+(?:\s+[\w]+)?)/i,
      // "X - Your solution"
      /\b([\w]+(?:\s+[\w]+)?)\s*[-–—]\s*(?:your|the|a)\s+/i,
      // Domain-based extraction
      /https?:\/\/(?:www\.)?([^\.\/]+)/i
    ];
    for (const pattern of productPatterns){
      const match = cleanContent.match(pattern);
      if (match && match[1]) {
        const candidateName = match[1].trim();
        // Validate it's a reasonable product name
        if (candidateName.length > 2 && candidateName.length < 30 && !candidateName.match(/^(the|and|for|with|your|our)$/i)) {
          info.productName = candidateName;
          break;
        }
      }
    }
  }
  // 3. Extract from URL as last resort
  if (!info.productName && content.includes('anthropic.com')) {
    info.productName = 'Claude';
  } else if (!info.productName && content.includes('stripe.com')) {
    info.productName = 'Stripe';
  } else if (!info.productName && content.includes('notion.so')) {
    info.productName = 'Notion';
  } else if (!info.productName && content.includes('openai.com')) {
    info.productName = 'OpenAI';
  } else if (!info.productName && content.includes('mailchimp.com')) {
    info.productName = 'Mailchimp';
  } else if (!info.productName && content.includes('liftlio.com')) {
    info.productName = 'Liftlio';
  }
  // 4. Look for specific product mentions in content
  if (!info.productName) {
    // Look for frequently mentioned capitalized words
    const capitalizedWords = cleanContent.match(/\b[A-Z][\w]+(?:\s+[A-Z][\w]+)?\b/g) || [];
    const wordFrequency = {};
    capitalizedWords.forEach((word)=>{
      if (word.length > 2 && !word.match(/^(The|And|For|With|Your|Our|This|That|What|When|Where|How)$/)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    // Find most frequent capitalized word/phrase
    let maxFreq = 0;
    for (const [word, freq] of Object.entries(wordFrequency)){
      if (freq > maxFreq && freq > 2) {
        maxFreq = freq;
        info.productName = word;
      }
    }
  }
  // Detect topic based on actual content keywords
  const topicDetection = [
    {
      keywords: /\b(payment|pagamento|checkout|transaction|transação|billing|cobrança|invoice|fatura|card|cartão|bank|banco|money|dinheiro|pay|pagar|charge|cobrar|subscription|assinatura|recurring|recorrente)\b/gi,
      topic: 'pagamentos e finanças',
      category: 'Payment Processing'
    },
    {
      keywords: /\b(ai|artificial intelligence|inteligência artificial|machine learning|automation|automação|bot|chatbot|llm|language model|neural|assistant)\b/gi,
      topic: 'IA e automação',
      category: 'AI Tools'
    },
    {
      keywords: /\b(marketing|campaign|campanha|email|seo|ads|advertising|publicidade|social media|mídia social|content|conteúdo|lead|leads)\b/gi,
      topic: 'marketing digital',
      category: 'Digital Marketing'
    },
    {
      keywords: /\b(productivity|produtividade|task|tarefa|project|projeto|manage|gerenciar|organize|organizar|workflow|fluxo)\b/gi,
      topic: 'produtividade',
      category: 'Productivity Tools'
    },
    {
      keywords: /\b(education|educação|course|curso|learn|aprender|teach|ensinar|training|treinamento|tutorial)\b/gi,
      topic: 'educação online',
      category: 'Educational Content'
    },
    {
      keywords: /\b(health|saúde|fitness|exercise|exercício|wellness|bem-estar|medical|médico|therapy|terapia)\b/gi,
      topic: 'saúde e bem-estar',
      category: 'Health & Wellness'
    },
    {
      keywords: /\b(sales|vendas|crm|lead|conversion|conversão|customer|cliente|pipeline|funil)\b/gi,
      topic: 'vendas e conversões',
      category: 'Sales Tools'
    },
    {
      keywords: /\b(analytics|análise|data|dados|metrics|métricas|dashboard|report|relatório|insights)\b/gi,
      topic: 'análise de dados',
      category: 'Analytics Tools'
    }
  ];
  // Count keyword matches for each topic
  let bestMatch = {
    count: 0,
    topic: 'tecnologia',
    category: 'Business Tools'
  };
  for (const detection of topicDetection){
    const matches = lowerContent.match(detection.keywords);
    const count = matches ? matches.length : 0;
    if (count > bestMatch.count) {
      bestMatch = {
        count: count,
        topic: detection.topic,
        category: detection.category
      };
    }
  }
  info.topic = bestMatch.topic;
  info.category = bestMatch.category;
  console.log('Extraction results:', {
    productName: info.productName,
    topic: info.topic,
    category: info.category,
    topicConfidence: bestMatch.count
  });
  // Extract specific benefits based on content
  const benefitPatterns = [
    {
      pattern: /\b(fast|rápido|quick|instant|instantâneo)\b/gi,
      benefit: 'velocidade'
    },
    {
      pattern: /\b(easy|fácil|simple|simples|intuitive|intuitivo)\b/gi,
      benefit: 'facilidade'
    },
    {
      pattern: /\b(secure|seguro|safe|protection|proteção|security|segurança)\b/gi,
      benefit: 'segurança'
    },
    {
      pattern: /\b(save|economize|reduce|reduz|cut|corta)\s+(cost|custo|money|dinheiro|time|tempo)\b/gi,
      benefit: 'economia'
    },
    {
      pattern: /\b(automate|automatiza|automatic|automático)\b/gi,
      benefit: 'automação'
    },
    {
      pattern: /\b(integrate|integra|connect|conecta|api)\b/gi,
      benefit: 'integração'
    },
    {
      pattern: /\b(scale|escala|grow|crescer|expand|expandir)\b/gi,
      benefit: 'escalabilidade'
    },
    {
      pattern: /\b(reliable|confiável|trusted|confiança|stable|estável)\b/gi,
      benefit: 'confiabilidade'
    }
  ];
  const foundBenefits = new Set();
  for (const { pattern, benefit } of benefitPatterns){
    if (pattern.test(lowerContent)) {
      foundBenefits.add(benefit);
    }
  }
  info.benefits = Array.from(foundBenefits);
  if (info.benefits.length === 0) {
    // Default benefits based on topic
    const defaultBenefits = {
      'pagamentos e finanças': [
        'segurança',
        'rapidez',
        'confiabilidade'
      ],
      'IA e automação': [
        'eficiência',
        'automação',
        'economia de tempo'
      ],
      'marketing digital': [
        'alcance',
        'conversão',
        'análise'
      ],
      'produtividade': [
        'organização',
        'eficiência',
        'colaboração'
      ],
      'educação online': [
        'aprendizado',
        'flexibilidade',
        'qualidade'
      ],
      'saúde e bem-estar': [
        'bem-estar',
        'resultados',
        'acompanhamento'
      ],
      'vendas e conversões': [
        'conversão',
        'gestão',
        'resultados'
      ],
      'análise de dados': [
        'insights',
        'decisões',
        'visualização'
      ],
      'tecnologia': [
        'inovação',
        'eficiência',
        'qualidade'
      ]
    };
    info.benefits = defaultBenefits[info.topic] || [
      'qualidade',
      'eficiência',
      'inovação'
    ];
  }
  return info;
} /* ===== EXEMPLOS DE TESTE NO PAINEL DO SUPABASE ===== */  /*
TESTE 1 - Localhost (sem rate limit):
{
  "url": "https://liftlio.com",
  "language": "pt",
  "ip": "127.0.0.1"
}
ESPERADO: Funciona sempre, sem limite. Resposta inclui "developmentMode": true

TESTE 2 - IP privado (192.168.x.x - sem rate limit):
{
  "url": "https://stripe.com",
  "language": "en",
  "ip": "192.168.1.100"
}
ESPERADO: Funciona sempre, sem limite

TESTE 3 - IP público (com rate limit):
{
  "url": "https://notion.so",
  "language": "pt",
  "ip": "189.45.67.123"
}
ESPERADO: Funciona até 3x em 24h, depois erro 429

TESTE 4 - Apenas conteúdo + localhost:
{
  "language": "en",
  "additionalContent": "Product description here...",
  "ip": "::1"
}
ESPERADO: Funciona sem limite (IPv6 localhost)

TESTE 5 - Quarta requisição com IP público:
{
  "url": "https://example.com",
  "language": "pt",
  "ip": "189.45.67.123"
}
ESPERADO: Erro 429 com mensagem de rate limit

===== RESPOSTA COM DESENVOLVIMENTO =====
{
  "success": true,
  "url": "https://liftlio.com",
  "language": "pt",
  "contentLanguage": "en",
  "contentSource": "scraped",
  "simulation": { ... },
  "productInfo": { ... },
  "developmentMode": true,
  "message": "Running in development mode - rate limiting disabled"
}

===== IPs CONSIDERADOS LOCALHOST/DESENVOLVIMENTO =====
- 127.0.0.1
- localhost
- ::1 (IPv6)
- 0.0.0.0
- 192.168.x.x (rede privada)
- 10.x.x.x (rede privada)
- 172.16-31.x.x (rede privada)
*/
