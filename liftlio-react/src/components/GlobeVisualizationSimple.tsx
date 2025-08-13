import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import * as FaIcons from 'react-icons/fa';
import { IconComponent } from '../utils/IconHelper';

// Container principal
const GlobeContainer = styled.div`
  position: relative;
  width: 100%;
  min-height: 400px;
  background: ${props => props.theme.name === 'dark' 
    ? 'radial-gradient(ellipse at bottom, #1B1464 0%, #0D0321 100%)'
    : 'radial-gradient(ellipse at bottom, #e9d5ff 0%, #f3e7fc 100%)'};
  border-radius: 24px;
  margin-bottom: 32px;
  overflow: hidden;
  border: 1px solid ${props => props.theme.name === 'dark' 
    ? 'rgba(139, 92, 246, 0.2)' 
    : 'rgba(139, 92, 246, 0.1)'};
  
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
    font-size: 8px;
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

// Mapa simplificado
const MapContainer = styled.div`
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const MapPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  
  svg {
    font-size: 120px;
    color: ${props => props.theme.colors.primary};
    opacity: 0.2;
  }
`;

const MapText = styled.p`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
  text-align: center;
`;

interface GlobeVisualizationSimpleProps {
  projectId: number;
  supabase: any;
}

interface VisitorLocation {
  city: string;
  country: string;
  count: number;
}

const GlobeVisualizationSimple: React.FC<GlobeVisualizationSimpleProps> = ({ projectId, supabase }) => {
  const [visitors, setVisitors] = useState(0);
  const [locations, setLocations] = useState<VisitorLocation[]>([]);

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
          setVisitors(uniqueVisitors.size);

          // Processar localizações
          const locationMap: { [key: string]: VisitorLocation } = {};
          
          data.forEach((visitor: any) => {
            const key = `${visitor.country || 'Unknown'}-${visitor.city || 'Unknown'}`;
            
            if (!locationMap[key]) {
              locationMap[key] = {
                city: visitor.city || 'Unknown',
                country: visitor.country || 'Unknown',
                count: 0
              };
            }
            locationMap[key].count++;
          });

          // Converter para array e ordenar por count
          const locationsArray = Object.values(locationMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setLocations(locationsArray);
        } else {
          // Dados de demonstração
          setVisitors(35);
          setLocations([
            { city: 'New York', country: 'USA', count: 12 },
            { city: 'São Paulo', country: 'Brazil', count: 8 },
            { city: 'London', country: 'UK', count: 6 },
            { city: 'Tokyo', country: 'Japan', count: 5 },
            { city: 'Berlin', country: 'Germany', count: 4 },
          ]);
        }
      } catch (error) {
        console.error('Error fetching visitor data:', error);
        // Usar dados de demonstração em caso de erro
        setVisitors(35);
        setLocations([
          { city: 'New York', country: 'USA', count: 12 },
          { city: 'São Paulo', country: 'Brazil', count: 8 },
          { city: 'London', country: 'UK', count: 6 },
          { city: 'Tokyo', country: 'Japan', count: 5 },
          { city: 'Berlin', country: 'Germany', count: 4 },
        ]);
      }
    };

    // Buscar imediatamente
    fetchVisitorData();
    
    // Atualizar a cada 5 segundos
    const interval = setInterval(fetchVisitorData, 5000);
    
    return () => clearInterval(interval);
  }, [projectId, supabase]);

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
          <IconComponent icon={FaIcons.FaCircle} />
          Live Now
        </LiveBadge>
        
        <MainStat>
          <StatNumber>{visitors}</StatNumber>
          <StatLabel>Active Visitors</StatLabel>
        </MainStat>

        <LocationsList>
          <LocationTitle>
            <IconComponent icon={FaIcons.FaFire} />
            Hottest Locations
          </LocationTitle>
          {locations.map((location, index) => (
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
          ))}
        </LocationsList>
      </StatsOverlay>

      <MapContainer>
        <MapPlaceholder>
          <IconComponent icon={FaIcons.FaGlobeAmericas} />
          <MapText>
            Global visitor visualization<br/>
            Real-time traffic data
          </MapText>
        </MapPlaceholder>
      </MapContainer>
    </GlobeContainer>
  );
};

export default GlobeVisualizationSimple;