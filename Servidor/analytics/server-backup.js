const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'liftlio-analytics',
    timestamp: new Date().toISOString() 
  });
});

// Servir arquivo track.js
app.get('/track.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(__dirname, 'track.js'));
});

// Endpoint para receber eventos de analytics
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

    // Validar project_id
    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    // Verificar se o projeto existe
    const { data: project, error: projectError } = await supabase
      .from('Projeto')
      .select('id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('Invalid project_id:', project_id);
      return res.status(400).json({ error: 'Invalid project_id' });
    }

    // Preparar dados do evento
    const eventData = {
      project_id: parseInt(project_id),
      event_type: event_type || 'pageview',
      visitor_id: visitor_id || generateVisitorId(),
      session_id: session_id || generateSessionId(),
      page_url: page_url || req.headers.referer,
      page_title: page_title || '',
      referrer: referrer || '',
      user_agent: user_agent || req.headers['user-agent'],
      screen_resolution: screen_resolution || '',
      viewport_size: viewport_size || '',
      device_type: device_type || detectDeviceType(req.headers['user-agent']),
      browser: browser || detectBrowser(req.headers['user-agent']),
      os: os || detectOS(req.headers['user-agent']),
      country: country || '',
      city: city || '',
      custom_data: custom_data || {}
    };

    // Chamar função RPC track_event
    const { data, error } = await supabase.rpc('track_event', eventData);

    if (error) {
      console.error('Error tracking event:', error);
      return res.status(500).json({ error: 'Failed to track event' });
    }

    res.json({ 
      success: true, 
      event_id: data,
      message: 'Event tracked successfully' 
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Funções auxiliares
function generateVisitorId() {
  return 'visitor_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

function generateSessionId() {
  return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now();
}

function detectDeviceType(userAgent) {
  if (!userAgent) return 'unknown';
  if (/mobile/i.test(userAgent)) return 'mobile';
  if (/tablet/i.test(userAgent)) return 'tablet';
  return 'desktop';
}

function detectBrowser(userAgent) {
  if (!userAgent) return 'unknown';
  if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) return 'Chrome';
  if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) return 'Safari';
  if (/firefox/i.test(userAgent)) return 'Firefox';
  if (/edge/i.test(userAgent)) return 'Edge';
  return 'Other';
}

function detectOS(userAgent) {
  if (!userAgent) return 'unknown';
  if (/windows/i.test(userAgent)) return 'Windows';
  if (/mac/i.test(userAgent)) return 'macOS';
  if (/linux/i.test(userAgent)) return 'Linux';
  if (/android/i.test(userAgent)) return 'Android';
  if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS';
  return 'Other';
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Liftlio Analytics Server running on port ${PORT}`);
  console.log(`📊 Track endpoint: http://localhost:${PORT}/track`);
  console.log(`📜 Script available at: http://localhost:${PORT}/track.js`);
});