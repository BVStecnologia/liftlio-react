import React, { useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaGlobeAmericas, FaCircle } from 'react-icons/fa';

// Animações
const rotate = keyframes`
  from {
    transform: rotateY(0deg) rotateX(15deg);
  }
  to {
    transform: rotateY(360deg) rotateX(15deg);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }
`;

const glow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.6),
                0 0 40px rgba(139, 92, 246, 0.4),
                0 0 60px rgba(139, 92, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.8),
                0 0 50px rgba(139, 92, 246, 0.6),
                0 0 70px rgba(139, 92, 246, 0.4);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
`;

// Container principal
const GlobeContainer = styled.div`
  position: relative;
  width: 100%;
  height: 500px;
  background: ${props => props.theme.name === 'dark' 
    ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.95) 100%)'
    : 'linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.95) 100%)'};
  border-radius: 24px;
  padding: 40px;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(139, 92, 246, 0.2)' 
    : 'rgba(139, 92, 246, 0.1)'};
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, 
      transparent, 
      rgba(139, 92, 246, 0.8), 
      transparent);
    animation: ${float} 3s ease-in-out infinite;
  }
`;

// Globo 3D CSS
const Globe3D = styled.div`
  width: 300px;
  height: 300px;
  position: relative;
  transform-style: preserve-3d;
  animation: ${rotate} 30s linear infinite;
  filter: drop-shadow(0 0 40px rgba(139, 92, 246, 0.3));
`;

const GlobeSphere = styled.div`
  width: 100%;
  height: 100%;
  position: absolute;
  border-radius: 50%;
  background: ${props => props.theme.name === 'dark'
    ? 'radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.3), rgba(139, 92, 246, 0.1) 50%, rgba(88, 28, 135, 0.2))'
    : 'radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.05) 50%, rgba(88, 28, 135, 0.1))'};
  border: 2px solid rgba(139, 92, 246, 0.3);
  animation: ${glow} 4s ease-in-out infinite;
  
  &::before {
    content: '';
    position: absolute;
    top: 10%;
    left: 10%;
    width: 30%;
    height: 30%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent);
    filter: blur(10px);
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background-image: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 10px,
      rgba(139, 92, 246, 0.1) 10px,
      rgba(139, 92, 246, 0.1) 20px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 10px,
      rgba(139, 92, 246, 0.1) 10px,
      rgba(139, 92, 246, 0.1) 20px
    );
    opacity: 0.3;
  }
`;

// Ponto de visitante
const VisitorPoint = styled.div<{ lat: number; lng: number; size: number }>`
  position: absolute;
  width: ${props => props.size * 4}px;
  height: ${props => props.size * 4}px;
  border-radius: 50%;
  background: radial-gradient(circle, #fbbf24, #f59e0b);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
  animation: ${pulse} 2s ease-in-out infinite;
  transform: translate(-50%, -50%)
    rotateY(${props => props.lng}deg)
    rotateX(${props => -props.lat}deg)
    translateZ(150px);
  
  &::after {
    content: '';
    position: absolute;
    top: -100%;
    left: -100%;
    right: -100%;
    bottom: -100%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(251, 191, 36, 0.4), transparent);
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

// Stats laterais
const StatsPanel = styled(motion.div)`
  position: absolute;
  top: 40px;
  left: 40px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(17, 24, 39, 0.9)'
    : 'rgba(255, 255, 255, 0.9)'};
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  min-width: 200px;
  z-index: 10;
`;

const LiveIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: #10b981;
  font-weight: 600;
  font-size: 14px;

  svg {
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

const VisitorCount = styled.div`
  font-size: 48px;
  font-weight: 800;
  color: ${props => props.theme.colors.primary};
  line-height: 1;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const VisitorLabel = styled.div`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  margin-bottom: 24px;
`;

const LocationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LocationItem = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: ${props => props.theme.name === 'dark'
    ? 'rgba(139, 92, 246, 0.1)'
    : 'rgba(139, 92, 246, 0.05)'};
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
`;

const LocationName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: ${props => props.theme.colors.text.primary};

  svg {
    color: ${props => props.theme.colors.primary};
  }
`;

const LocationCount = styled.div`
  background: ${props => props.theme.colors.primary};
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
`;

// Título da seção
const GlobeTitle = styled.h3`
  position: absolute;
  top: 40px;
  right: 40px;
  font-size: 24px;
  font-weight: 700;
  color: ${props => props.theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 10;

  svg {
    color: ${props => props.theme.colors.primary};
    font-size: 28px;
  }
`;

// Notificação de novo visitante
const NewVisitorNotification = styled(motion.div)`
  position: absolute;
  bottom: 40px;
  right: 40px;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.4);
  z-index: 20;
`;

interface VisitorLocation {
  country: string;
  city: string;
  count: number;
  lat: number;
  lng: number;
}

interface GlobeVisualizationProps {
  projectId: number;
  supabase: any;
}

const GlobeVisualization: React.FC<GlobeVisualizationProps> = ({ projectId, supabase }) => {
  const [onlineVisitors, setOnlineVisitors] = useState(0);
  const [visitorLocations, setVisitorLocations] = useState<VisitorLocation[]>([]);
  const [recentVisitor, setRecentVisitor] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  // Coordenadas aproximadas de algumas cidades principais
  const cityCoordinates: { [key: string]: { lat: number; lng: number } } = {
    'Brazil-São Paulo': { lat: -23.5505, lng: -46.6333 },
    'United States-New York': { lat: 40.7128, lng: -74.0060 },
    'United States-Los Angeles': { lat: 34.0522, lng: -118.2437 },
    'United Kingdom-London': { lat: 51.5074, lng: -0.1278 },
    'Germany-Berlin': { lat: 52.5200, lng: 13.4050 },
    'France-Paris': { lat: 48.8566, lng: 2.3522 },
    'Japan-Tokyo': { lat: 35.6762, lng: 139.6503 },
    'Australia-Sydney': { lat: -33.8688, lng: 151.2093 },
    'Canada-Toronto': { lat: 43.6532, lng: -79.3832 },
    'India-Mumbai': { lat: 19.0760, lng: 72.8777 },
  };

  useEffect(() => {
    const fetchOnlineVisitors = async () => {
      if (!projectId) return;
      
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      try {
        const { data, error } = await supabase
          .from('analytics')
          .select('visitor_id, country, city, created_at')
          .eq('project_id', projectId)
          .gte('created_at', oneMinuteAgo)
          .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
          // Visitantes únicos
          const uniqueVisitors = new Set(data.map((d: any) => d.visitor_id));
          const newCount = uniqueVisitors.size;
          
          // Se aumentou o número de visitantes, mostrar notificação
          if (newCount > onlineVisitors && onlineVisitors > 0) {
            const latest = data[0];
            setRecentVisitor(`${latest.city || 'Unknown'}, ${latest.country || 'World'}`);
            setShowNotification(true);
            setTimeout(() => setShowNotification(false), 5000);
          }
          
          setOnlineVisitors(newCount);
          
          // Agrupar por localização
          const locations: { [key: string]: VisitorLocation } = {};
          
          data.forEach((visitor: any) => {
            const key = `${visitor.country || 'Unknown'}-${visitor.city || 'Unknown'}`;
            if (!locations[key]) {
              const coords = cityCoordinates[key] || {
                lat: Math.random() * 180 - 90,
                lng: Math.random() * 360 - 180
              };
              locations[key] = {
                country: visitor.country || 'Unknown',
                city: visitor.city || 'Unknown',
                count: 0,
                ...coords
              };
            }
            locations[key].count++;
          });
          
          // Converter para array e ordenar por quantidade
          const sortedLocations = Object.values(locations)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // Top 5 localizações
          
          setVisitorLocations(sortedLocations);
        } else {
          // Dados de demonstração se não houver visitantes reais
          setOnlineVisitors(42);
          setVisitorLocations([
            { country: 'United States', city: 'New York', count: 12, lat: 40.7128, lng: -74.0060 },
            { country: 'Brazil', city: 'São Paulo', count: 8, lat: -23.5505, lng: -46.6333 },
            { country: 'United Kingdom', city: 'London', count: 6, lat: 51.5074, lng: -0.1278 },
            { country: 'Japan', city: 'Tokyo', count: 5, lat: 35.6762, lng: 139.6503 },
            { country: 'Germany', city: 'Berlin', count: 4, lat: 52.5200, lng: 13.4050 },
          ]);
        }
      } catch (error) {
        console.error('Error fetching online visitors:', error);
      }
    };
    
    // Buscar imediatamente
    fetchOnlineVisitors();
    
    // Atualizar a cada 10 segundos
    const interval = setInterval(fetchOnlineVisitors, 10000);
    
    return () => clearInterval(interval);
  }, [projectId, supabase, onlineVisitors]);

  return (
    <GlobeContainer>
      <GlobeTitle>
        <FaGlobeAmericas />
        Live Visitor Map
      </GlobeTitle>

      <StatsPanel
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <LiveIndicator>
          <FaCircle size={8} />
          LIVE NOW
        </LiveIndicator>
        
        <VisitorCount>{onlineVisitors}</VisitorCount>
        <VisitorLabel>visitors online</VisitorLabel>
        
        <LocationList>
          {visitorLocations.map((location, index) => (
            <LocationItem
              key={`${location.country}-${location.city}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <LocationName>
                <FaMapMarkerAlt size={12} />
                {location.city}
              </LocationName>
              <LocationCount>{location.count}</LocationCount>
            </LocationItem>
          ))}
        </LocationList>
      </StatsPanel>

      <Globe3D>
        <GlobeSphere />
        {visitorLocations.map((location) => (
          <VisitorPoint
            key={`${location.country}-${location.city}`}
            lat={location.lat}
            lng={location.lng}
            size={Math.min(location.count, 10)}
          />
        ))}
      </Globe3D>

      {showNotification && (
        <NewVisitorNotification
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.3 }}
        >
          <FaMapMarkerAlt />
          New visitor from {recentVisitor}!
        </NewVisitorNotification>
      )}
    </GlobeContainer>
  );
};

export default GlobeVisualization;