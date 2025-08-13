(function() {
  'use strict';

  // Configuração
  const ANALYTICS_ENDPOINT = (function() {
    const scriptTag = document.currentScript || document.querySelector('script[data-project]');
    const src = scriptTag ? scriptTag.src : '';
    const url = new URL(src);
    return url.origin + '/track';
  })();

  // Obter project_id do atributo data-project
  const PROJECT_ID = (function() {
    const scriptTag = document.currentScript || document.querySelector('script[data-project]');
    return scriptTag ? scriptTag.getAttribute('data-project') : null;
  })();

  if (!PROJECT_ID) {
    console.error('Liftlio Analytics: data-project attribute is required');
    return;
  }

  // Gerenciar visitor_id
  const VISITOR_KEY = 'liftlio_visitor_id';
  const SESSION_KEY = 'liftlio_session_id';
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

  function getVisitorId() {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = 'visitor_' + Math.random().toString(36).substr(2, 9) + Date.now();
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  }

  function getSessionId() {
    const now = Date.now();
    const sessionData = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
    
    if (!sessionData.id || (now - sessionData.lastActivity) > SESSION_TIMEOUT) {
      sessionData.id = 'session_' + Math.random().toString(36).substr(2, 9) + now;
      sessionData.lastActivity = now;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } else {
      sessionData.lastActivity = now;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    }
    
    return sessionData.id;
  }

  // Detectar informações do dispositivo
  function getDeviceInfo() {
    return {
      screen_resolution: window.screen.width + 'x' + window.screen.height,
      viewport_size: window.innerWidth + 'x' + window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio || 1,
      color_depth: window.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language || navigator.userLanguage
    };
  }

  // Função principal de rastreamento
  function track(eventType, customData) {
    const deviceInfo = getDeviceInfo();
    
    const eventData = {
      project_id: PROJECT_ID,
      event_type: eventType || 'pageview',
      visitor_id: getVisitorId(),
      session_id: getSessionId(),
      page_url: window.location.href,
      page_title: document.title,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_resolution: deviceInfo.screen_resolution,
      viewport_size: deviceInfo.viewport_size,
      custom_data: {
        ...deviceInfo,
        ...customData
      }
    };

    // Enviar evento
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
      keepalive: true // Garante que o evento seja enviado mesmo ao sair da página
    }).catch(function(error) {
      console.error('Liftlio Analytics error:', error);
    });
  }

  // Auto-rastrear pageview
  track('pageview');

  // Rastrear quando a página é deixada
  window.addEventListener('beforeunload', function() {
    const timeOnPage = performance.now();
    track('page_leave', { time_on_page: Math.round(timeOnPage / 1000) });
  });

  // Rastrear cliques em links externos
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.href && !target.href.startsWith(window.location.origin)) {
      track('outbound_link', { 
        url: target.href,
        text: target.textContent.trim().substring(0, 100)
      });
    }
  });

  // Rastrear erros JavaScript
  window.addEventListener('error', function(e) {
    track('js_error', {
      message: e.message,
      filename: e.filename,
      line: e.lineno,
      column: e.colno,
      stack: e.error ? e.error.stack : ''
    });
  });

  // Expor API global
  window.liftlio = window.liftlio || {};
  window.liftlio.track = track;
  
  // Métodos convenientes
  window.liftlio.trackEvent = function(eventName, data) {
    track('custom_event', { event_name: eventName, ...data });
  };
  
  window.liftlio.trackGoal = function(goalName, value) {
    track('goal', { goal_name: goalName, goal_value: value });
  };
  
  window.liftlio.trackPurchase = function(orderId, value, items) {
    track('purchase', { order_id: orderId, order_value: value, items: items });
  };
  
  window.liftlio.setUser = function(userId, userData) {
    track('identify', { user_id: userId, user_data: userData });
  };

  // Rastrear performance
  if (window.performance && window.performance.timing) {
    window.addEventListener('load', function() {
      setTimeout(function() {
        const timing = window.performance.timing;
        const loadTime = timing.loadEventEnd - timing.navigationStart;
        const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
        const firstPaint = performance.getEntriesByType('paint')[0];
        
        track('performance', {
          load_time: loadTime,
          dom_ready: domReady,
          first_paint: firstPaint ? firstPaint.startTime : null,
          connection_type: navigator.connection ? navigator.connection.effectiveType : 'unknown'
        });
      }, 0);
    });
  }

  console.log('Liftlio Analytics loaded for project:', PROJECT_ID);

})();