import React, { useEffect, useRef, useState, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import Globe from 'react-globe.gl';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import * as FaIcons from 'react-icons/fa';
import { FaRoute, FaShoppingCart, FaCreditCard, FaCheckCircle, FaHome, FaSearch, FaMapMarkedAlt, FaBolt } from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';
import * as THREE from 'three';

// SOLUTION 4: Global Event Emitter for cross-component communication
class GlobeEventEmitter extends EventTarget {
  private static instance: GlobeEventEmitter;
  
  private constructor() {
    super();
  }
  
  static getInstance(): GlobeEventEmitter {
    if (!GlobeEventEmitter.instance) {
      GlobeEventEmitter.instance = new GlobeEventEmitter();
    }
    return GlobeEventEmitter.instance;
  }
  
  emitRefresh() {
    console.log('🚀 GlobeEventEmitter: Emitting refresh event');
    this.dispatchEvent(new CustomEvent('globe-refresh', { detail: { timestamp: Date.now() } }));
  }
}

// Export singleton instance
export const globeEventEmitter = GlobeEventEmitter.getInstance();

// Container principal
const GlobeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 600px;
  background: ${props => props.theme.name === 'dark' 
    ? 'radial-gradient(ellipse at bottom, #1B1464 0%, #0D0321 100%)'
    : 'radial-gradient(ellipse at bottom, #e9d5ff 0%, #f3e7fc 100%)'};
  border-radius: 24px;
  margin-bottom: 32px;
  overflow: hidden;
  position: relative;
`;

// Wrapper do Globo
const GlobeWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  
  canvas {
    outline: none !important;
  }
`;

// Stats Overlay
const StatsOverlay = styled(motion.div)`
  position: absolute;
  top: 40px;
  left: 40px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(26, 26, 26, 0.95)'
    : 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 28px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.1)'
    : props.theme.colors.border};
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  min-width: 260px;
  max-width: 320px;
  z-index: 10;
  max-height: 520px;
  display: flex;
  flex-direction: column;
`;

// Tabs Container
const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 4px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(37, 37, 37, 0.5)'
    : 'rgba(243, 244, 246, 0.5)'};
  border-radius: 12px;
`;

const TabButton = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 8px 12px;
  border: none;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #8b5cf6, #a855f7)'
    : 'transparent'};
  color: ${props => props.active 
    ? 'white' 
    : props.theme.colors.text.secondary};
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  
  &:hover {
    background: ${props => !props.active && props.theme.name === 'dark'
      ? 'rgba(139, 92, 246, 0.1)'
      : !props.active ? 'rgba(139, 92, 246, 0.05)' 
      : 'linear-gradient(135deg, #8b5cf6, #a855f7)'};
  }
  
  svg {
    font-size: 14px;
  }
`;

const TabContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.3) transparent;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(139, 92, 246, 0.3);
    border-radius: 2px;
  }
`;

const LiveBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  
  svg {
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.2); }
  }
`;

const MainStat = styled.div`
  margin-bottom: 24px;
`;

const StatNumber = styled.div`
  font-size: 56px;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  font-weight: 500;
`;

const LocationsList = styled.div`
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.1)'};
`;

const LocationTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const LocationItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(37, 37, 37, 0.5)'
    : 'rgba(249, 250, 251, 0.5)'};
  border-radius: 12px;
  margin-bottom: 8px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.08)'
    : 'rgba(229, 231, 235, 0.5)'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.name === 'dark'
      ? 'rgba(37, 37, 37, 0.8)'
      : 'rgba(243, 244, 246, 0.8)'};
    transform: translateX(4px);
    border-color: ${props => props.theme.name === 'dark'
      ? 'rgba(255, 255, 255, 0.12)'
      : 'rgba(209, 213, 219, 0.7)'};
  }
`;

const LocationName = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  
  svg {
    color: ${props => props.theme.name === 'dark' ? '#9ca3af' : '#6b7280'};
    font-size: 16px;
  }
`;

const LocationCount = styled.div`
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
`;

// Lista de eventos recentes
const RecentEventsList = styled.div`
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.1)'};
`;

// Journey Funnel Section
const JourneySection = styled.div`
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.1)'};
`;

const JourneyTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const JourneyStage = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(37, 37, 37, 0.4)'
    : 'rgba(249, 250, 251, 0.4)'};
  border-radius: 10px;
  margin-bottom: 8px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(255, 255, 255, 0.06)'
    : 'rgba(229, 231, 235, 0.4)'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.name === 'dark'
      ? 'rgba(37, 37, 37, 0.6)'
      : 'rgba(243, 244, 246, 0.6)'};
    transform: translateX(2px);
  }
`;

const StageInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const StageIcon = styled.div<{ stage: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: ${props => {
    switch(props.stage) {
      case 'visiting': return 'linear-gradient(135deg, #c084fc, #a855f7)';
      case 'browsing': return 'linear-gradient(135deg, #a855f7, #9333ea)';
      case 'cart': return 'linear-gradient(135deg, #9333ea, #7c3aed)';
      case 'checkout': return 'linear-gradient(135deg, #7c3aed, #6d28d9)';
      case 'purchased': return 'linear-gradient(135deg, #10b981, #059669)';
      default: return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    }
  }};
  color: white;
`;

const StageName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
`;

const StageCount = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CountBadge = styled.div`
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.15)'};
  color: ${props => props.theme.colors.primary};
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
`;

const LocationTag = styled.div`
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(107, 114, 128, 0.2)'
    : 'rgba(107, 114, 128, 0.1)'};
  color: ${props => props.theme.colors.text.secondary};
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 500;
`;

const EventItem = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(37, 37, 37, 0.3)'
    : 'rgba(249, 250, 251, 0.3)'};
  border-radius: 10px;
  margin-bottom: 8px;
  font-size: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.name === 'dark'
      ? 'rgba(37, 37, 37, 0.5)'
      : 'rgba(243, 244, 246, 0.5)'};
    transform: translateX(2px);
  }
`;

const EventIcon = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.2)'
    : 'rgba(139, 92, 246, 0.1)'};
  color: ${props => props.theme.colors.primary};
  font-size: 14px;
  flex-shrink: 0;
`;

const EventDetails = styled.div`
  flex: 1;
  
  .event-location {
    font-weight: 600;
    color: ${props => props.theme.colors.text.primary};
  }
  
  .event-type {
    color: ${props => props.theme.colors.text.secondary};
    font-size: 11px;
  }
`;

const EventTime = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 11px;
  white-space: nowrap;
`;

// Title Overlay
const TitleOverlay = styled.div`
  position: absolute;
  top: 50px;
  right: 40px;
  z-index: 10;
`;

const GlobeTitle = styled.h2`
  font-size: 32px;
  font-weight: 800;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 16px;
  
  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 36px;
  }
`;

const GlobeSubtitle = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  margin-top: 24px;
  margin-bottom: 0;
`;

// Notification Toast
const NotificationToast = styled(motion.div)`
  position: absolute;
  bottom: 40px;
  right: 40px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(17, 24, 39, 0.95)'
    : 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(20px);
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 16px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
  z-index: 20;
`;

const NotificationIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
`;

const NotificationText = styled.div`
  color: ${props => props.theme.colors.text.primary};
  font-size: 14px;
  font-weight: 600;
  
  span {
    color: ${props => props.theme.colors.primary};
    font-weight: 700;
  }
`;

interface GlobeVisualizationProProps {
  projectId: number;
  supabase: any;
  refreshTrigger?: number;
}

// SOLUTION 6: Expose imperative handle for parent control
export interface GlobeVisualizationHandle {
  refresh: () => void;
  forceUpdate: () => void;
}

interface VisitorLocation {
  lat: number;
  lng: number;
  size: number;
  city: string;
  country: string;
  count: number;
  color: string;
}

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

const GlobeVisualizationPro = forwardRef<GlobeVisualizationHandle, GlobeVisualizationProProps>(
  ({ projectId, supabase, refreshTrigger }, ref) => {
  const globeEl = useRef<any>(null);
  const [visitors, setVisitors] = useState(0);
  const [locations, setLocations] = useState<VisitorLocation[]>([]);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 segundos
  
  // SOLUTION: Force update counter to ensure Globe re-renders
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  
  // SOLUTION 9: Use ref to avoid stale closure in callbacks
  const fetchVisitorDataRef = useRef<(() => Promise<void>) | null>(null);
  
  // SOLUTION 6: Expose imperative methods to parent
  useImperativeHandle(ref, () => ({
    refresh: () => {
      console.log('💪 Imperative refresh called from parent!');
      if (fetchVisitorDataRef.current) {
        fetchVisitorDataRef.current();
      }
      // setForceUpdateKey(prev => prev + 1); // Removido para evitar loop
    },
    forceUpdate: () => {
      console.log('⚡ Force update called from parent!');
      // setForceUpdateKey(prev => prev + 1); // Removido para evitar loop
      // Force immediate data fetch
      if (fetchVisitorDataRef.current) {
        fetchVisitorDataRef.current();
      }
      // Also trigger globe ref update if available - with safety check
      if (globeEl.current && typeof globeEl.current.pointsData === 'function') {
        globeEl.current.pointsData([...locations]);
      } else if (globeEl.current) {
        console.log('⚠️ pointsData method not available on globe ref');
      }
    }
  }), [locations]); // Include locations in deps
  const [globeReady, setGlobeReady] = useState(false);
  const [journeyData, setJourneyData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'live' | 'journey'>('live');

  // Coordenadas de cidades principais
  const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
    // Brasil
    'BR-São Paulo': { lat: -23.5505, lng: -46.6333 },
    'BR-Sao Paulo': { lat: -23.5505, lng: -46.6333 },
    'BR-Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
    'BR-São José': { lat: -27.6147, lng: -48.6047 }, // São José, SC
    'BR-Florianópolis': { lat: -27.5954, lng: -48.5480 },
    'BR-Brasília': { lat: -15.7975, lng: -47.8919 },
    'BR-Salvador': { lat: -12.9714, lng: -38.5014 },
    'BR-Belo Horizonte': { lat: -19.9245, lng: -43.9352 },
    'BR-Curitiba': { lat: -25.4284, lng: -49.2733 },
    'BR-Porto Alegre': { lat: -30.0346, lng: -51.2177 },
    'BR-Recife': { lat: -8.0476, lng: -34.8770 },
    'BR-Fortaleza': { lat: -3.7172, lng: -38.5433 },
    
    // EUA
    'US-New York': { lat: 40.7128, lng: -74.0060 },
    'US-San Francisco': { lat: 37.7749, lng: -122.4194 },
    'US-Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'US-Chicago': { lat: 41.8781, lng: -87.6298 },
    'US-Houston': { lat: 29.7604, lng: -95.3698 },
    'US-Phoenix': { lat: 33.4484, lng: -112.0740 },
    
    // Europa
    'GB-London': { lat: 51.5074, lng: -0.1278 },
    'DE-Berlin': { lat: 52.5200, lng: 13.4050 },
    'FR-Paris': { lat: 48.8566, lng: 2.3522 },
    'ES-Madrid': { lat: 40.4168, lng: -3.7038 },
    'IT-Rome': { lat: 41.9028, lng: 12.4964 },
    'NL-Amsterdam': { lat: 52.3676, lng: 4.9041 },
    
    // Ásia
    'JP-Tokyo': { lat: 35.6762, lng: 139.6503 },
    'CN-Beijing': { lat: 39.9042, lng: 116.4074 },
    'IN-Mumbai': { lat: 19.0760, lng: 72.8777 },
    'KR-Seoul': { lat: 37.5665, lng: 126.9780 },
    
    // Outros
    'AU-Sydney': { lat: -33.8688, lng: 151.2093 },
    'CA-Toronto': { lat: 43.6532, lng: -79.3832 },
    'MX-Mexico City': { lat: 19.4326, lng: -99.1332 },
    'AR-Buenos Aires': { lat: -34.6037, lng: -58.3816 },
    'RU-Moscow': { lat: 55.7558, lng: 37.6173 },
    
    // Fallback genérico por país
    'BR': { lat: -14.2350, lng: -51.9253 }, // Centro do Brasil
    'US': { lat: 37.0902, lng: -95.7129 }, // Centro dos EUA
    'GB': { lat: 55.3781, lng: -3.4360 }, // Centro do Reino Unido
  };

  // Configuração inicial do globo
  useEffect(() => {
    if (globeEl.current && !globeReady) {
      // Tentar adicionar iluminação customizada se o método scene estiver disponível
      try {
        if (globeEl.current.scene && typeof globeEl.current.scene === 'function') {
          const scene = globeEl.current.scene();
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
          scene.add(ambientLight);
          
          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight.position.set(1, 1, 1);
          scene.add(directionalLight);
        }

        // Configurar ponto de vista e rotação se os métodos estiverem disponíveis
        if (globeEl.current.pointOfView && typeof globeEl.current.pointOfView === 'function') {
          globeEl.current.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
        }

        if (globeEl.current.controls && typeof globeEl.current.controls === 'function') {
          const controls = globeEl.current.controls();
          if (controls) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.5;
          }
        }
      } catch (error) {
        console.warn('Alguns métodos do Globe não estão disponíveis:', error);
      }
      
      setGlobeReady(true);
    }
  }, [globeReady]);

  // Detectar se a página está visível
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
      if (!document.hidden) {
        console.log('🟢 Page visible - resuming updates');
      } else {
        console.log('🔴 Page hidden - pausing updates');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Também detectar quando a janela perde/ganha foco
    const handleFocus = () => {
      setIsPageVisible(true);
      console.log('🟢 Window focused - resuming updates');
    };
    
    const handleBlur = () => {
      setIsPageVisible(false);
      console.log('🔴 Window blurred - pausing updates');
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Função de fetch movida para fora para ser acessível no realtime
  const fetchVisitorData = useCallback(async () => {
    console.log('🎯 Globe fetchVisitorData called!', {
      projectId,
      isPageVisible,
      timestamp: new Date().toLocaleTimeString(),
      caller: new Error().stack?.split('\n')[2]?.trim() // Para ver de onde foi chamado
    });
    
    if (!projectId) return;
      
      // Performance optimization: não buscar se página não estiver visível
      if (!isPageVisible) {
        console.log('⏸️ Skipping fetch - page not visible');
        return;
      }
      
      console.log('📊 Fetching visitor data...', { 
        activeTab, 
        timestamp: new Date().toLocaleTimeString() 
      });

      try {
        // Buscar eventos dos últimos 5 minutos (reduzido para melhor performance)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        
        // Buscar dados da jornada agregados (apenas se a tab Journey estiver ativa)
        if (activeTab === 'journey') {
          const { data: journeyStats, error: journeyError } = await supabase
            .rpc('get_visitor_journey_map', { 
              p_project_id: projectId, 
              p_time_window: '30 minutes' 
            });

          if (journeyStats && !journeyError) {
            // Agrupar por estágio e somar visitantes
            const stageMap = new Map();
            journeyStats.forEach((item: any) => {
              const stage = item.journey_stage;
              if (!stageMap.has(stage)) {
                stageMap.set(stage, {
                  stage: stage,
                  count: 0,
                  locations: []
                });
              }
              const stageData = stageMap.get(stage);
              stageData.count += parseInt(item.visitor_count);
              if (stageData.locations.length < 3) { // Máximo 3 localizações por estágio
                stageData.locations.push({
                  city: item.location_city,
                  country: item.location_country,
                  count: item.visitor_count
                });
              }
            });

            // Converter para array ordenado pelo funil
            const stageOrder = ['visiting', 'browsing', 'cart', 'checkout', 'purchased'];
            const orderedJourney = stageOrder
              .map(stage => stageMap.get(stage))
              .filter(Boolean);
            
            setJourneyData(orderedJourney);
          }
        }
        
        const { data, error } = await supabase
          .from('analytics')
          .select('visitor_id, country, custom_data, event_type, url, created_at')
          .eq('project_id', projectId)
          .gte('created_at', thirtyMinutesAgo)
          .order('created_at', { ascending: false });

        console.log('📊 Analytics data received:', { 
          totalRecords: data?.length || 0,
          firstRecord: data?.[0],
          projectId 
        });

        if (data && data.length > 0) {
          // Contar visitantes únicos
          const uniqueVisitors = new Set(data.map((d: any) => d.visitor_id));
          const newCount = uniqueVisitors.size;
          
          console.log('👥 Unique visitors:', newCount);
          console.log('📍 Visitor IDs:', Array.from(uniqueVisitors));
          
          // Processar visitantes ativos com dados reais
          if (data.length > 0) {
            const processedVisitors = data.slice(0, 10).map((visitor: any) => {
              const now = new Date();
              const visitTime = new Date(visitor.created_at);
              const diffMinutes = Math.floor((now.getTime() - visitTime.getTime()) / (1000 * 60));
              
              let timeAgo = 'Now';
              if (diffMinutes >= 1) {
                timeAgo = `${diffMinutes}m ago`;
              }
              
              return {
                ...visitor,
                city: visitor.custom_data?.city || visitor.city || 'Unknown',
                page: visitor.url || '/',
                activity: visitor.event_type || 'pageview',
                timeAgo: timeAgo
              };
            });
            setActiveVisitors(processedVisitors);
          }
          
          setVisitors(newCount);

          // Processar localizações
          const locationMap: { [key: string]: VisitorLocation } = {};
          
          data.forEach((visitor: any) => {
            const city = visitor.custom_data?.city || visitor.city || 'Unknown';
            const country = visitor.country || 'Unknown';
            const key = `${country}-${city}`;
            
            if (!locationMap[key]) {
              // Tentar várias combinações para encontrar as coordenadas
              const lookupKeys = [
                `${country}-${city}`,
                `${country}`,
                key
              ];
              
              console.log('🔍 Looking for coordinates:', {
                country,
                city,
                lookupKeys,
                availableKeys: Object.keys(cityCoordinates).filter(k => k.includes(country))
              });
              
              const coords = 
                cityCoordinates[`${country}-${city}`] || // Formato completo
                cityCoordinates[`${country}`] || // Só país
                cityCoordinates[key] || // Chave original
                {
                  // Coordenadas aleatórias se não encontrar
                  lat: (Math.random() - 0.5) * 140,
                  lng: (Math.random() - 0.5) * 340
                };
              
              locationMap[key] = {
                ...coords,
                city: city,
                country: country,
                count: 0,
                size: 0,
                color: '#c084fc' // Roxo claro padrão
              };
            }
            locationMap[key].count++;
          });

          // Converter para array e calcular tamanhos
          const locationsArray = Object.values(locationMap).map(loc => ({
            ...loc,
            size: Math.min(loc.count * 0.5, 3),
            color: loc.count > 5 ? '#8b5cf6' : loc.count > 2 ? '#a855f7' : '#c084fc' // Tons de roxo
          }));

          console.log('🌍 Globe locations processed:', {
            count: locationsArray.length,
            locations: locationsArray,
            locationMap
          });

          setLocations(locationsArray);
          
          // SOLUTION 1: Imperative update through globe ref - with safety check
          if (globeEl.current && typeof globeEl.current.pointsData === 'function') {
            console.log('🎯 Imperative update: Setting points data directly on globe');
            globeEl.current.pointsData(locationsArray);
          } else if (globeEl.current) {
            console.log('⚠️ Globe ref exists but pointsData method not available');
          }
          
          // SOLUTION 2: Force component key update
          // setForceUpdateKey(prev => prev + 1); // Removido para evitar loop

          // Criar arcos de conexão entre localizações
          if (locationsArray.length > 1) {
            const newArcs: Arc[] = [];
            for (let i = 0; i < Math.min(locationsArray.length - 1, 5); i++) {
              newArcs.push({
                startLat: locationsArray[i].lat,
                startLng: locationsArray[i].lng,
                endLat: locationsArray[i + 1].lat,
                endLng: locationsArray[i + 1].lng,
                color: ['#8b5cf6', '#a855f7', '#c084fc'][i % 3]
              });
            }
            setArcs(newArcs);
          }
        } else {
          // Sem dados reais - mostrar 0 visitantes
          setVisitors(0);
          setLocations([]);
          setActiveVisitors([]);
          setArcs([]);
          
          // SOLUTION: Clear globe data imperatively - with safety check
          if (globeEl.current) {
            if (typeof globeEl.current.pointsData === 'function') {
              globeEl.current.pointsData([]);
            }
            if (typeof globeEl.current.arcsData === 'function') {
              globeEl.current.arcsData([]);
            }
          }
          // setForceUpdateKey(prev => prev + 1); // Removido para evitar loop
        }
    } catch (error) {
      console.error('Error fetching visitor data:', error);
    }
  }, [projectId, isPageVisible, activeTab, supabase, cityCoordinates]);
  
  // Assign the function to ref to avoid stale closures
  useEffect(() => {
    fetchVisitorDataRef.current = fetchVisitorData;
  }, [fetchVisitorData]);

  // SOLUTION 3: Multiple trigger mechanisms
  // useEffect separado para responder ao trigger externo
  useEffect(() => {
    console.log('👀 Globe: refreshTrigger useEffect executed. Value:', refreshTrigger);
    if (refreshTrigger && refreshTrigger > 0) {
      console.log('🔄 Globe: External refresh trigger received!', refreshTrigger);
      
      // SOLUTION: Multiple force update strategies
      // 1. Call fetch immediately
      fetchVisitorData();
      
      // 2. Force update the key
      // setForceUpdateKey(prev => prev + 1); // Removido para evitar loop
      
      // 3. Reset interval to trigger immediate fetch
      setRefreshInterval(100); // Very short interval
      setTimeout(() => setRefreshInterval(5000), 200); // Reset back after fetch
    }
  }, [refreshTrigger]); // Remove fetchVisitorData from deps to avoid stale closure

  // SOLUTION 5: Event listener for global refresh events
  useEffect(() => {
    const handleGlobeRefresh = (event: Event) => {
      console.log('📡 Globe: Received global refresh event', (event as CustomEvent).detail);
      fetchVisitorData();
      // setForceUpdateKey(prev => prev + 1); // Removido para evitar loop
    };
    
    globeEventEmitter.addEventListener('globe-refresh', handleGlobeRefresh);
    
    return () => {
      globeEventEmitter.removeEventListener('globe-refresh', handleGlobeRefresh);
    };
  }, []); // Empty deps to setup once
  
  // SOLUTION 8: Window custom event listener as fallback
  useEffect(() => {
    const handleWindowGlobeUpdate = (event: Event) => {
      console.log('🪟 Globe: Received window custom event', (event as CustomEvent).detail);
      fetchVisitorData();
      // setForceUpdateKey(prev => prev + 1); // Removido para evitar loop
      // Force immediate globe update - with safety check
      if (globeEl.current) {
        const newData = [...locations];
        if (typeof globeEl.current.pointsData === 'function') {
          globeEl.current.pointsData(newData);
        }
        if (typeof globeEl.current.arcsData === 'function') {
          globeEl.current.arcsData([...arcs]);
        }
      }
    };
    
    window.addEventListener('globe-force-update', handleWindowGlobeUpdate);
    
    return () => {
      window.removeEventListener('globe-force-update', handleWindowGlobeUpdate);
    };
  }, [locations, arcs]); // Include data deps
  
  // useEffect para buscar dados iniciais
  useEffect(() => {
    // Buscar imediatamente ao montar o componente
    console.log('🚀 Globe: Initial fetch on mount/dependencies change');
    fetchVisitorData();
  }, [projectId, fetchVisitorData]);
  
  // useEffect separado para o interval
  useEffect(() => {
    // Só criar interval se tiver projectId
    if (!projectId) return;
    
    console.log(`⏰ Globe: Setting up interval (${refreshInterval}ms)`);
    
    const interval = setInterval(() => {
      if (isPageVisible) {
        console.log(`🔄 Globe: Periodic refresh (${refreshInterval}ms)`);
        fetchVisitorData();
      }
    }, refreshInterval);
    
    // Cleanup: limpar interval
    return () => {
      console.log('🛑 Globe: Clearing interval');
      clearInterval(interval);
    };
  }, [refreshInterval, isPageVisible, fetchVisitorData, projectId]);

  // HTML customizado para os pontos - removido por incompatibilidade de tipos

  // Log para debug de re-render
  console.log('🔄 Globe Component Rendering:', {
    visitors,
    locationsCount: locations.length,
    locations: locations.slice(0, 3), // Primeiras 3 para não poluir console
    timestamp: new Date().toLocaleTimeString()
  });

  return (
    <GlobeContainer>
      <TitleOverlay>
        <GlobeTitle>
          <IconComponent icon={FaIcons.FaGlobeAmericas} />
          Live Global Traffic
        </GlobeTitle>
        <GlobeSubtitle>Real-time visitor activity from around the world</GlobeSubtitle>
      </TitleOverlay>

      <StatsOverlay
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <LiveBadge>
          <IconComponent icon={FaIcons.FaCircle} style={{ 
            fontSize: '8px',
            animation: 'pulse 2s infinite'
          }} />
          Live Now
        </LiveBadge>
        
        <MainStat>
          <StatNumber>{visitors}</StatNumber>
          <StatLabel>
            {visitors > 0 ? 'Active Visitors' : 'No Active Visitors'}
            {visitors === 0 && <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
              Last 30 minutes
            </div>}
          </StatLabel>
        </MainStat>

        <TabsContainer>
          <TabButton 
            active={activeTab === 'live'} 
            onClick={() => setActiveTab('live')}
          >
            <IconComponent icon={FaMapMarkedAlt} />
            Live
          </TabButton>
          <TabButton 
            active={activeTab === 'journey'} 
            onClick={() => setActiveTab('journey')}
          >
            <IconComponent icon={FaRoute} />
            Journey
          </TabButton>
        </TabsContainer>

        <TabContent>
          {activeTab === 'live' ? (
            <>
              <LocationsList>
                <LocationTitle>
                  <IconComponent icon={FaIcons.FaFire} />
                  Hottest Locations
                </LocationTitle>
                {locations.length > 0 ? locations.slice(0, 5).map((location, index) => (
            <LocationItem
              key={`${location.country}-${location.city}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <LocationName>
                <IconComponent icon={FaIcons.FaMapMarkerAlt} />
                {location.city}, {location.country}
              </LocationName>
              <LocationCount>{location.count}</LocationCount>
            </LocationItem>
                )) : (
                  <div style={{ 
                    padding: '20px', 
                    textAlign: 'center', 
                    color: 'rgba(139, 92, 246, 0.6)',
                    fontSize: '13px'
                  }}>
                    No visitor activity detected
                  </div>
                )}
              </LocationsList>

              {activeVisitors.length > 0 && (
                <RecentEventsList>
                  <LocationTitle>
                    <IconComponent icon={FaBolt} />
                    Recent Activity
                  </LocationTitle>
                  {activeVisitors.slice(0, 5).map((visitor, index) => (
                    <EventItem
                      key={`event-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <EventIcon>
                        {visitor.event_type === 'pageview' && <IconComponent icon={FaIcons.FaEye} />}
                        {visitor.event_type === 'click' && <IconComponent icon={FaIcons.FaMousePointer} />}
                        {visitor.event_type === 'scroll' && <IconComponent icon={FaIcons.FaArrowDown} />}
                        {visitor.event_type === 'performance' && <IconComponent icon={FaIcons.FaTachometerAlt} />}
                        {visitor.event_type === 'page_leave' && <IconComponent icon={FaIcons.FaSignOutAlt} />}
                        {!['pageview', 'click', 'scroll', 'performance', 'page_leave'].includes(visitor.event_type) && 
                          <IconComponent icon={FaIcons.FaCircle} />}
                      </EventIcon>
                      <EventDetails>
                        <div className="event-location">{visitor.city}, {visitor.country}</div>
                        <div className="event-type">{visitor.event_type || 'pageview'}</div>
                      </EventDetails>
                      <EventTime>{visitor.timeAgo}</EventTime>
                    </EventItem>
                  ))}
                </RecentEventsList>
              )}
            </>
          ) : (
            /* Journey Tab Content */
            journeyData.length > 0 ? (
              <JourneySection style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
                {journeyData.map((stage, index) => (
              <JourneyStage
                key={stage.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <StageInfo>
                  <StageIcon stage={stage.stage}>
                    {stage.stage === 'visiting' && <IconComponent icon={FaHome} />}
                    {stage.stage === 'browsing' && <IconComponent icon={FaSearch} />}
                    {stage.stage === 'cart' && <IconComponent icon={FaShoppingCart} />}
                    {stage.stage === 'checkout' && <IconComponent icon={FaCreditCard} />}
                    {stage.stage === 'purchased' && <IconComponent icon={FaCheckCircle} />}
                  </StageIcon>
                  <div>
                    <StageName>
                      {stage.stage === 'visiting' && 'Visiting'}
                      {stage.stage === 'browsing' && 'Browsing Products'}
                      {stage.stage === 'cart' && 'Added to Cart'}
                      {stage.stage === 'checkout' && 'At Checkout'}
                      {stage.stage === 'purchased' && 'Purchased'}
                    </StageName>
                    {stage.locations.length > 0 && (
                      <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {stage.locations.slice(0, 2).map((loc: any, idx: number) => (
                          <LocationTag key={idx}>
                            {loc.city} ({loc.count})
                          </LocationTag>
                        ))}
                      </div>
                    )}
                  </div>
                </StageInfo>
                <StageCount>
                  <CountBadge>{stage.count}</CountBadge>
                </StageCount>
                  </JourneyStage>
                ))}
              </JourneySection>
            ) : (
              <div style={{ 
                padding: '40px 20px', 
                textAlign: 'center', 
                color: 'rgba(139, 92, 246, 0.6)',
                fontSize: '13px'
              }}>
                No journey data available
              </div>
            )
          )}
        </TabContent>
      </StatsOverlay>

      <GlobeWrapper>
        <Globe
          ref={globeEl}
          width={window.innerWidth}
          height={600}
          backgroundColor="rgba(0,0,0,0)"
          
          // Configurações visuais do globo
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          showAtmosphere={true}
          atmosphereColor="#8b5cf6"
          atmosphereAltitude={0.25}
          
          // Pontos de visitantes
          pointsData={locations}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude={0.01}
          pointRadius="size"
          pointResolution={12}
          
          // Arcos de conexão
          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor="color"
          arcDashLength={0.5}
          arcDashGap={0.2}
          arcDashAnimateTime={1500}
          arcStroke={0.5}
          arcsTransitionDuration={0}
          
          
          // Hexágonos (densidade)
          hexBinPointsData={locations}
          hexBinPointLat="lat"
          hexBinPointLng="lng"
          hexBinResolution={4}
          hexAltitude={0.01}
          hexTopColor={() => '#8b5cf6'}
          hexSideColor={() => '#7c3aed'}
          hexBinMerge={true}
          
          // Anéis de pulso
          ringsData={locations.filter(l => l.count > 5)}
          ringLat="lat"
          ringLng="lng"
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={2000}
          ringColor={() => '#8b5cf6'}
        />
      </GlobeWrapper>

      {/* Removido toast de notificação - agora mostra visitantes ativos no StatsOverlay */}
    </GlobeContainer>
  );
});

GlobeVisualizationPro.displayName = 'GlobeVisualizationPro';

export default GlobeVisualizationPro;