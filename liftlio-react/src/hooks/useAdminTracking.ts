import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

// ==========================================
// ADMIN TRACKING HOOK
// Tracking interno do liftlio.com para o Admin
// ==========================================

interface GeoData {
  country: string;
  countryCode: string;
  city: string;
}

let geoCache: GeoData | null = null;
let geoFetchPromise: Promise<GeoData> | null = null;

// Buscar geolocalização via IP (usando ipwho.is - gratuito)
const getGeoLocation = async (): Promise<GeoData> => {
  if (geoCache) return geoCache;
  if (geoFetchPromise) return geoFetchPromise;

  geoFetchPromise = (async () => {
    try {
      const response = await fetch('https://ipwho.is/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        geoCache = {
          country: data.country || 'Unknown',
          countryCode: data.country_code || '',
          city: data.city || 'Unknown'
        };
        console.debug('[AdminTracking] Geo:', geoCache);
        return geoCache;
      }
    } catch (error) {
      console.debug('[AdminTracking] Geo lookup failed:', error);
    }
    geoCache = { country: 'Unknown', countryCode: '', city: 'Unknown' };
    return geoCache;
  })();
  return geoFetchPromise;
};

const getVisitorId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('liftlio_admin_visitor_id');
  if (!id) {
    id = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now();
    localStorage.setItem('liftlio_admin_visitor_id', id);
  }
  return id;
};

const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  let id = sessionStorage.getItem('liftlio_admin_session_id');
  if (!id) {
    id = 's_' + Math.random().toString(36).substr(2, 9) + Date.now();
    sessionStorage.setItem('liftlio_admin_session_id', id);
  }
  return id;
};

const getDeviceType = (): string => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone/.test(ua)) return 'mobile';
  if (/tablet|ipad/.test(ua)) return 'tablet';
  return 'desktop';
};

const getBrowser = (): string => {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Opera') || ua.includes('OPR/')) return 'Opera';
  return 'Other';
};

export const useAdminTracking = () => {
  const location = useLocation();
  const { user } = useAuth();
  const lastPage = useRef<string>('');
  const pageStartTime = useRef<number>(Date.now());
  const isTracking = useRef<boolean>(false);
  const geoDataRef = useRef<GeoData | null>(null);

  useEffect(() => {
    getGeoLocation().then(geo => {
      geoDataRef.current = geo;
    });
  }, []);

  const trackEvent = useCallback(async (
    eventType: string,
    pagePath: string,
    extraData?: Record<string, unknown>
  ) => {
    try {
      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      const geo = geoDataRef.current || await getGeoLocation();

      await supabase.rpc('track_admin_event', {
        p_user_id: user?.id || null,
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_event_type: eventType,
        p_page_path: pagePath,
        p_page_title: typeof document !== 'undefined' ? document.title : null,
        p_referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        p_device_type: getDeviceType(),
        p_browser: getBrowser(),
        p_country: geo.country,
        p_city: geo.city,
        p_time_on_page: extraData?.timeOnPage as number || null,
        p_scroll_depth: extraData?.scrollDepth as number || null,
        p_click_target: extraData?.clickTarget as string || null,
        p_custom_data: {
          ...(extraData?.customData as Record<string, unknown> || {}),
          country_code: geo.countryCode
        }
      });
    } catch (error) {
      console.debug('[AdminTracking] Error:', error);
    }
  }, [user]);

  const updatePresence = useCallback(async (pagePath: string) => {
    try {
      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      const geo = geoDataRef.current || await getGeoLocation();

      await supabase.rpc('upsert_admin_presence', {
        p_user_id: user?.id || null,
        p_visitor_id: visitorId,
        p_session_id: sessionId,
        p_current_page: pagePath,
        p_user_email: user?.email || null,
        p_device_type: getDeviceType(),
        p_browser: getBrowser(),
        p_country: geo.country
      });
    } catch (error) {
      console.debug('[AdminTracking] Presence error:', error);
    }
  }, [user]);

  useEffect(() => {
    if (isTracking.current) return;
    isTracking.current = true;

    const currentPath = location.pathname;
    const visitorId = getVisitorId();

    if (!visitorId) {
      isTracking.current = false;
      return;
    }

    if (lastPage.current && lastPage.current !== currentPath) {
      const timeOnPage = Math.round((Date.now() - pageStartTime.current) / 1000);
      trackEvent('page_leave', lastPage.current, { timeOnPage });
    }

    trackEvent('pageview', currentPath);
    updatePresence(currentPath);

    lastPage.current = currentPath;
    pageStartTime.current = Date.now();

    setTimeout(() => {
      isTracking.current = false;
    }, 100);
  }, [location.pathname, trackEvent, updatePresence]);

  useEffect(() => {
    const interval = setInterval(() => {
      updatePresence(location.pathname);
    }, 30000);
    return () => clearInterval(interval);
  }, [location.pathname, updatePresence]);

  return {
    trackClick: (target: string) => trackEvent('click', location.pathname, { clickTarget: target }),
    trackScroll: (depth: number) => trackEvent('scroll', location.pathname, { scrollDepth: depth }),
    trackCustom: (eventType: string, data?: Record<string, unknown>) =>
      trackEvent(eventType, location.pathname, { customData: data })
  };
};

export default useAdminTracking;
