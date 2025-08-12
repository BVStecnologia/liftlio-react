import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCircle, FaMapMarkerAlt, FaGlobeAmericas, FaUsers, FaFire } from 'react-icons/fa';
import * as THREE from 'three';

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
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(139, 92, 246, 0.2)' 
    : 'rgba(139, 92, 246, 0.1)'};
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, 
      transparent,
      #8b5cf6 20%,
      #a855f7 50%,
      #8b5cf6 80%,
      transparent
    );
    animation: shimmer 3s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
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
    ? 'rgba(17, 24, 39, 0.95)'
    : 'rgba(255, 255, 255, 0.95)'};
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 28px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.3)'
    : 'rgba(139, 92, 246, 0.2)'};
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  min-width: 260px;
  z-index: 10;
`;

const LiveBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  
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
    ? 'rgba(139, 92, 246, 0.05)'
    : 'rgba(139, 92, 246, 0.03)'};
  border-radius: 12px;
  margin-bottom: 8px;
  border: 1px solid ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.15)'
    : 'rgba(139, 92, 246, 0.1)'};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.theme.name === 'dark'
      ? 'rgba(139, 92, 246, 0.1)'
      : 'rgba(139, 92, 246, 0.05)'};
    transform: translateX(4px);
    border-color: ${props => props.theme.colors.primary};
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
    color: ${props => props.theme.colors.primary};
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

// Title Overlay
const TitleOverlay = styled.div`
  position: absolute;
  top: 40px;
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
  margin-top: 8px;
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

const GlobeVisualizationPro: React.FC<GlobeVisualizationProProps> = ({ projectId, supabase }) => {
  const globeEl = useRef<any>(null);
  const [visitors, setVisitors] = useState(0);
  const [locations, setLocations] = useState<VisitorLocation[]>([]);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [recentLocation, setRecentLocation] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);

  // Coordenadas de cidades principais
  const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
    'Brazil-São Paulo': { lat: -23.5505, lng: -46.6333 },
    'Brazil-Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
    'United States-New York': { lat: 40.7128, lng: -74.0060 },
    'United States-San Francisco': { lat: 37.7749, lng: -122.4194 },
    'United States-Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'United Kingdom-London': { lat: 51.5074, lng: -0.1278 },
    'Germany-Berlin': { lat: 52.5200, lng: 13.4050 },
    'France-Paris': { lat: 48.8566, lng: 2.3522 },
    'Japan-Tokyo': { lat: 35.6762, lng: 139.6503 },
    'China-Beijing': { lat: 39.9042, lng: 116.4074 },
    'Australia-Sydney': { lat: -33.8688, lng: 151.2093 },
    'Canada-Toronto': { lat: 43.6532, lng: -79.3832 },
    'India-Mumbai': { lat: 19.0760, lng: 72.8777 },
    'Mexico-Mexico City': { lat: 19.4326, lng: -99.1332 },
    'Argentina-Buenos Aires': { lat: -34.6037, lng: -58.3816 },
    'Spain-Madrid': { lat: 40.4168, lng: -3.7038 },
    'Italy-Rome': { lat: 41.9028, lng: 12.4964 },
    'Russia-Moscow': { lat: 55.7558, lng: 37.6173 },
    'South Korea-Seoul': { lat: 37.5665, lng: 126.9780 },
    'Netherlands-Amsterdam': { lat: 52.3676, lng: 4.9041 },
  };

  // Configuração inicial do globo
  useEffect(() => {
    if (globeEl.current && !globeReady) {
      // Configurações do globo
      globeEl.current
        .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
        .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
        .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
        .showAtmosphere(true)
        .atmosphereColor('#8b5cf6')
        .atmosphereAltitude(0.25)
        .pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);

      // Adicionar iluminação customizada
      const scene = globeEl.current.scene();
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      // Auto-rotação
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      
      setGlobeReady(true);
    }
  }, [globeReady]);

  // Fetch de dados
  useEffect(() => {
    const fetchVisitorData = async () => {
      if (!projectId) return;

      try {
        // Buscar eventos dos últimos 60 segundos
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        
        const { data, error } = await supabase
          .from('analytics')
          .select('visitor_id, country, city, created_at')
          .eq('project_id', projectId)
          .gte('created_at', oneMinuteAgo)
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          // Contar visitantes únicos
          const uniqueVisitors = new Set(data.map((d: any) => d.visitor_id));
          const newCount = uniqueVisitors.size;
          
          // Mostrar notificação se houver novo visitante
          if (newCount > visitors && visitors > 0) {
            const latest = data[0];
            setRecentLocation(`${latest.city || 'Unknown'}, ${latest.country || 'World'}`);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
          
          setVisitors(newCount);

          // Processar localizações
          const locationMap: { [key: string]: VisitorLocation } = {};
          
          data.forEach((visitor: any) => {
            const key = `${visitor.country || 'Unknown'}-${visitor.city || 'Unknown'}`;
            
            if (!locationMap[key]) {
              const coords = cityCoordinates[key] || {
                lat: (Math.random() - 0.5) * 180,
                lng: (Math.random() - 0.5) * 360
              };
              
              locationMap[key] = {
                ...coords,
                city: visitor.city || 'Unknown',
                country: visitor.country || 'Unknown',
                count: 0,
                size: 0,
                color: '#fbbf24'
              };
            }
            locationMap[key].count++;
          });

          // Converter para array e calcular tamanhos
          const locationsArray = Object.values(locationMap).map(loc => ({
            ...loc,
            size: Math.min(loc.count * 0.5, 3),
            color: loc.count > 5 ? '#ef4444' : loc.count > 2 ? '#fbbf24' : '#10b981'
          }));

          setLocations(locationsArray);

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
          // Dados de demonstração
          const demoLocations = [
            { ...cityCoordinates['United States-New York'], city: 'New York', country: 'USA', count: 12, size: 2, color: '#ef4444' },
            { ...cityCoordinates['Brazil-São Paulo'], city: 'São Paulo', country: 'Brazil', count: 8, size: 1.5, color: '#fbbf24' },
            { ...cityCoordinates['United Kingdom-London'], city: 'London', country: 'UK', count: 6, size: 1.2, color: '#fbbf24' },
            { ...cityCoordinates['Japan-Tokyo'], city: 'Tokyo', country: 'Japan', count: 5, size: 1, color: '#10b981' },
            { ...cityCoordinates['Germany-Berlin'], city: 'Berlin', country: 'Germany', count: 4, size: 0.8, color: '#10b981' },
          ];
          
          setVisitors(35);
          setLocations(demoLocations);
          
          // Criar arcos de demonstração
          const demoArcs: Arc[] = [
            {
              startLat: demoLocations[0].lat,
              startLng: demoLocations[0].lng,
              endLat: demoLocations[1].lat,
              endLng: demoLocations[1].lng,
              color: '#8b5cf6'
            },
            {
              startLat: demoLocations[1].lat,
              startLng: demoLocations[1].lng,
              endLat: demoLocations[2].lat,
              endLng: demoLocations[2].lng,
              color: '#a855f7'
            },
            {
              startLat: demoLocations[2].lat,
              startLng: demoLocations[2].lng,
              endLat: demoLocations[3].lat,
              endLng: demoLocations[3].lng,
              color: '#c084fc'
            }
          ];
          setArcs(demoArcs);
        }
      } catch (error) {
        console.error('Error fetching visitor data:', error);
      }
    };

    // Buscar imediatamente
    fetchVisitorData();
    
    // Atualizar a cada 5 segundos
    const interval = setInterval(fetchVisitorData, 5000);
    
    return () => clearInterval(interval);
  }, [projectId, supabase, visitors]);

  // HTML customizado para os pontos
  const htmlElement = useMemo(() => {
    return (d: any) => `
      <div style="
        color: #fff;
        font-size: 12px;
        font-weight: bold;
        text-align: center;
        background: rgba(139, 92, 246, 0.8);
        padding: 4px 8px;
        border-radius: 8px;
        backdrop-filter: blur(10px);
      ">
        ${d.city}
      </div>
    `;
  }, []);

  return (
    <GlobeContainer>
      <TitleOverlay>
        <GlobeTitle>
          <FaGlobeAmericas />
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
          <FaCircle size={8} />
          Live Now
        </LiveBadge>
        
        <MainStat>
          <StatNumber>{visitors}</StatNumber>
          <StatLabel>Active Visitors</StatLabel>
        </MainStat>

        <LocationsList>
          <LocationTitle>
            <FaFire />
            Hottest Locations
          </LocationTitle>
          {locations.slice(0, 5).map((location, index) => (
            <LocationItem
              key={`${location.country}-${location.city}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <LocationName>
                <FaMapMarkerAlt />
                {location.city}, {location.country}
              </LocationName>
              <LocationCount>{location.count}</LocationCount>
            </LocationItem>
          ))}
        </LocationsList>
      </StatsOverlay>

      <GlobeWrapper>
        <Globe
          ref={globeEl}
          width={window.innerWidth}
          height={600}
          backgroundColor="rgba(0,0,0,0)"
          
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
          
          // Labels HTML
          htmlElementsData={locations}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={htmlElement}
          htmlAltitude={0.02}
          
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

      <AnimatePresence>
        {showNotification && (
          <NotificationToast
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <NotificationIcon>
              <FaUsers />
            </NotificationIcon>
            <NotificationText>
              New visitor from <span>{recentLocation}</span>
            </NotificationText>
          </NotificationToast>
        )}
      </AnimatePresence>
    </GlobeContainer>
  );
};

export default GlobeVisualizationPro;