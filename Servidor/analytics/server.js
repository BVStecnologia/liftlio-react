const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ================================================
// CONFIGURAÇÃO SUPABASE
// ================================================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ================================================
// CACHE DE EVENTOS PARA DEDUPLICAÇÃO
// ================================================
const eventCache = new Map();
const CACHE_TTL = 5000; // 5 segundos

// Limpar cache periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of eventCache.entries()) {
    if (now - timestamp > CACHE_TTL) {
      eventCache.delete(key);
    }
  }
}, 10000);

// ================================================
// RATE LIMITING POR VISITOR
// ================================================
const visitorRateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const MAX_EVENTS_PER_MINUTE = 30;

// ================================================
// LISTAS DE DETECÇÃO DE BOTS
// ================================================
const BOT_USER_AGENTS = [
  'bot', 'crawler', 'spider', 'scraper', 'headless',
  'phantom', 'selenium', 'puppeteer', 'wget', 'curl',
  'python', 'java/', 'go-http-client', 'postman',
  'insomnia', 'axios', 'fetch', 'node-fetch', 'got',
  'lighthouse', 'gtmetrix', 'pingdom', 'uptime',
  'ahrefsbot', 'semrushbot', 'dotbot', 'mj12bot',
  'blexbot', 'yandexbot', 'bingbot', 'slurp',
  'duckduckbot', 'baiduspider', 'facebookexternalhit',
  'twitterbot', 'linkedinbot', 'whatsapp', 'telegram'
];

// IPs suspeitos (adicionar conforme necessário)
const BLOCKED_IPS = new Set([
  // Adicionar IPs de bots conhecidos aqui
]);

// ================================================
// FUNÇÕES DE VALIDAÇÃO
// ================================================

function isBot(userAgent, ip) {
  if (!userAgent) return true;
  
  const ua = userAgent.toLowerCase();
  
  // 1. Verificar lista de bots
  if (BOT_USER_AGENTS.some(bot => ua.includes(bot))) {
    return true;
  }
  
  // 2. User agents suspeitos
  if (ua === 'mozilla/5.0' || ua.length < 20) {
    return true;
  }
  
  // 3. IPs bloqueados
  if (BLOCKED_IPS.has(ip)) {
    return true;
  }
  
  // 4. Verificar se tem características de navegador real
  const hasValidBrowser = ua.includes('chrome') || 
                          ua.includes('firefox') || 
                          ua.includes('safari') || 
                          ua.includes('edge');
  
  const hasValidOS = ua.includes('windows') || 
                     ua.includes('mac') || 
                     ua.includes('linux') || 
                     ua.includes('android') || 
                     ua.includes('ios');
  
  return !hasValidBrowser || !hasValidOS;
}

function checkRateLimit(visitorId) {
  const now = Date.now();
  
  if (!visitorRateLimit.has(visitorId)) {
    visitorRateLimit.set(visitorId, { count: 1, timestamp: now });
    return true;
  }
  
  const visitor = visitorRateLimit.get(visitorId);
  
  // Reset se passou o tempo da janela
  if (now - visitor.timestamp > RATE_LIMIT_WINDOW) {
    visitor.count = 1;
    visitor.timestamp = now;
    return true;
  }
  
  // Incrementar e verificar limite
  visitor.count++;
  return visitor.count <= MAX_EVENTS_PER_MINUTE;
}

function isDuplicate(visitorId, eventType, url) {
  const key = `${visitorId}-${eventType}-${url}`;
  const now = Date.now();
  
  if (eventCache.has(key)) {
    const lastTime = eventCache.get(key);
    if (now - lastTime < CACHE_TTL) {
      return true; // É duplicado
    }
  }
  
  eventCache.set(key, now);
  return false;
}

function identifyTrafficSource(referrer, url) {
  if (!referrer || referrer === '') {
    return 'Direct';
  }
  
  const ref = referrer.toLowerCase();
  
  // Motores de busca
  if (ref.includes('google.')) return 'Google Search';
  if (ref.includes('bing.')) return 'Bing Search';
  if (ref.includes('yahoo.')) return 'Yahoo Search';
  if (ref.includes('duckduckgo.')) return 'DuckDuckGo';
  if (ref.includes('baidu.')) return 'Baidu';
  if (ref.includes('yandex.')) return 'Yandex';
  
  // Redes sociais
  if (ref.includes('facebook.') || ref.includes('fb.')) return 'Facebook';
  if (ref.includes('twitter.') || ref.includes('t.co')) return 'Twitter/X';
  if (ref.includes('linkedin.')) return 'LinkedIn';
  if (ref.includes('instagram.')) return 'Instagram';
  if (ref.includes('youtube.')) return 'YouTube';
  if (ref.includes('tiktok.')) return 'TikTok';
  if (ref.includes('reddit.')) return 'Reddit';
  if (ref.includes('pinterest.')) return 'Pinterest';
  
  // Liftlio
  if (ref.includes('liftlio.')) return 'Liftlio Internal';
  
  // Claude AI
  if (ref.includes('claude.ai')) return 'Claude AI';
  
  return 'External Site';
}

function extractUTMParams(url) {
  if (!url) return {};
  
  try {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    
    return {
      utm_source: params.get('utm_source') || null,
      utm_medium: params.get('utm_medium') || null,
      utm_campaign: params.get('utm_campaign') || null,
      utm_term: params.get('utm_term') || null,
      utm_content: params.get('utm_content') || null
    };
  } catch {
    return {};
  }
}

// ================================================
// MIDDLEWARE
// ================================================
// CORS Inteligente - Detecta se está atrás de proxy
app.use((req, res, next) => {
  // Se vier do Cloudflare, ele já adiciona CORS
  const isCloudflare = req.headers['cf-ray'] || req.headers['cf-connecting-ip'];
  
  // Se NÃO for Cloudflare, adiciona CORS
  if (!isCloudflare) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
  }
  
  // Responde OPTIONS para preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
app.use(express.json());

// ================================================
// ENDPOINTS
// ================================================

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'liftlio-analytics-improved',
    timestamp: new Date().toISOString(),
    features: {
      bot_detection: true,
      rate_limiting: true,
      deduplication: true,
      traffic_source: true
    }
  });
});

// Servir arquivo t.js
app.get('/t.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  // CORS já configurado globalmente
  res.sendFile(path.join(__dirname, 't.js'));
});

// Compatibilidade com track.js
app.get('/track.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  // CORS já configurado globalmente
  res.sendFile(path.join(__dirname, 't.js'));
});

// ================================================
// ENDPOINT PRINCIPAL DE TRACKING
// ================================================
app.post('/track', async (req, res) => {
  try {
    const {
      project_id,
      event_type,
      visitor_id,
      session_id,
      page_url,
      page_title,
      referrer,
      user_agent,
      screen_resolution,
      viewport_size,
      device_type,
      browser,
      os,
      country,
      city,
      custom_data
    } = req.body;

    // IP do cliente
    const clientIP = req.headers['x-forwarded-for'] || 
                    req.headers['x-real-ip'] || 
                    req.connection.remoteAddress;

    // ================================================
    // VALIDAÇÕES
    // ================================================
    
    // 1. Verificar project_id
    if (!project_id) {
      return res.status(400).json({ 
        error: 'project_id is required',
        rejected: true 
      });
    }

    // 2. Verificar se é bot
    const botDetected = isBot(user_agent || req.headers['user-agent'], clientIP);
    if (botDetected) {
      console.log(`[BOT DETECTED] IP: ${clientIP}, UA: ${user_agent}`);
      
      // Salvar em tabela separada para análise (opcional)
      // await supabase.from('analytics_rejected').insert({...});
      
      return res.json({ 
        success: false, 
        message: 'Bot detected',
        rejected: true
      });
    }

    // 3. Verificar rate limit
    if (!checkRateLimit(visitor_id)) {
      console.log(`[RATE LIMIT] Visitor: ${visitor_id}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        rejected: true 
      });
    }

    // 4. Verificar duplicados
    if (isDuplicate(visitor_id, event_type, page_url)) {
      console.log(`[DUPLICATE] Visitor: ${visitor_id}, Event: ${event_type}`);
      return res.json({ 
        success: false, 
        message: 'Duplicate event',
        rejected: true 
      });
    }

    // 5. Verificar se projeto existe
    const { data: project, error: projectError } = await supabase
      .from('Projeto')
      .select('id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Invalid project_id:', project_id);
      return res.status(400).json({ 
        error: 'Invalid project_id',
        rejected: true 
      });
    }

    // ================================================
    // ENRIQUECIMENTO DE DADOS
    // ================================================
    
    // Identificar origem do tráfego
    const trafficSource = identifyTrafficSource(referrer, page_url);
    
    // Extrair UTM parameters
    const utmParams = extractUTMParams(page_url);
    
    // Determinar se é tráfego orgânico
    let isOrganic = null; // null para não-search
    if (trafficSource.includes('Search')) {
      // É search - verificar se é orgânico ou pago
      isOrganic = !utmParams.utm_medium || 
                  (utmParams.utm_medium !== 'cpc' && 
                   utmParams.utm_medium !== 'ppc' &&
                   !utmParams.utm_source?.includes('ads'));
    }
    
    // Criar fingerprint do visitante
    const fingerprint = crypto
      .createHash('md5')
      .update(`${user_agent}-${screen_resolution}-${viewport_size}`)
      .digest('hex');

    // ================================================
    // PREPARAR DADOS PARA SALVAR
    // ================================================
    const enrichedData = {
      ...custom_data,
      traffic_source: trafficSource,
      utm_params: utmParams,
      fingerprint: fingerprint,
      is_bot: false,
      is_organic: isOrganic, // Adicionar aqui também para referência
      page_title: page_title || '',
      user_agent: user_agent || req.headers['user-agent'],
      viewport_size: viewport_size || '',
      screen_resolution: screen_resolution || '',
      client_ip: clientIP, // Considerar hash para privacidade
      validated_at: new Date().toISOString()
    };

    // Garantir que todos os campos estejam preenchidos
    const eventData = {
      project_id: parseInt(project_id),
      event_type: event_type || 'pageview',
      visitor_id: visitor_id || generateVisitorId(),
      session_id: session_id || generateSessionId(),
      page_url: page_url || req.headers.referer || '',
      page_title: page_title || '',
      referrer: referrer || '',
      user_agent: user_agent || req.headers['user-agent'] || 'Unknown',
      screen_resolution: screen_resolution || '',
      viewport_size: viewport_size || '',
      device_type: device_type || detectDeviceType(user_agent || req.headers['user-agent']),
      browser: browser || detectBrowser(user_agent || req.headers['user-agent']),
      os: os || detectOS(user_agent || req.headers['user-agent']),
      country: country || '',
      city: city || '',
      is_organic: isOrganic, // CAMPO NOVO DIRETO NA TABELA!
      custom_data: enrichedData
    };

    // ================================================
    // SALVAR NO SUPABASE
    // ================================================
    const { data, error } = await supabase.rpc('track_event', eventData);

    if (error) {
      console.error('Error tracking event:', error);
      return res.status(500).json({ 
        error: 'Failed to track event',
        rejected: true 
      });
    }

    // Log de sucesso
    console.log(`[EVENT TRACKED] ID: ${data}, Type: ${event_type}, Source: ${trafficSource}`);

    res.json({ 
      success: true, 
      event_id: data,
      message: 'Event tracked successfully',
      traffic_source: trafficSource
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      rejected: true 
    });
  }
});

// ================================================
// FUNÇÕES AUXILIARES
// ================================================
function generateVisitorId() {
  return 'visitor_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function detectBrowser(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome') && !ua.includes('edg')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('opera') || ua.includes('opr/')) return 'Opera';
  return 'Other';
}

function detectOS(userAgent) {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (ua.includes('windows nt 10.0')) return 'Windows 10';
  if (ua.includes('windows nt 11.0')) return 'Windows 11';
  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac os x')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('android')) return 'Android';
  if (/iphone|ipad|ipod/.test(ua)) return 'iOS';
  return 'Other';
}

// ================================================
// INICIAR SERVIDOR
// ================================================
app.listen(PORT, () => {
  console.log(`🚀 Liftlio Analytics Server (Improved) running on port ${PORT}`);
  console.log(`📊 Track endpoint: http://localhost:${PORT}/track`);
  console.log(`📜 Script available at: http://localhost:${PORT}/t.js`);
  console.log(`✅ Features: Bot Detection, Rate Limiting, Deduplication, Traffic Source`);
  console.log(`🔒 Max ${MAX_EVENTS_PER_MINUTE} events/minute per visitor`);
});