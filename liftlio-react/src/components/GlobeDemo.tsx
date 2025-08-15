import React, { useEffect, useRef, useState, Suspense, lazy } from 'react';
import styled from 'styled-components';
import GlobeFallback from './GlobeFallback';
import GlobeErrorBoundary from './GlobeErrorBoundary';

// Lazy load do Globe para evitar erros de carregamento
const Globe = lazy(() => import('react-globe.gl').catch(() => {
  // Se falhar ao carregar, retorna um componente vazio
  return { default: () => <GlobeFallback /> };
}));

const GlobeWrapper = styled.div`
  width: 100%;
  height: 550px;
  position: relative;
  cursor: grab;
  background: radial-gradient(ellipse at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    cursor: grabbing;
  }
`;

interface LocationData {
  lat: number;
  lng: number;
  label: string;
  country: string;
  visitors?: number;
  size?: number;
  color?: string;
}

const DEMO_LOCATIONS: LocationData[] = [
  { lat: -23.5505, lng: -46.6333, label: 'São Paulo', country: 'BR', visitors: 342, size: 1.2 },
  { lat: 40.7128, lng: -74.0060, label: 'New York', country: 'US', visitors: 521, size: 1.5 },
  { lat: 51.5074, lng: -0.1278, label: 'London', country: 'UK', visitors: 287, size: 1.1 },
  { lat: 35.6762, lng: 139.6503, label: 'Tokyo', country: 'JP', visitors: 198, size: 0.9 },
  { lat: 48.8566, lng: 2.3522, label: 'Paris', country: 'FR', visitors: 165, size: 0.8 },
  { lat: -33.8688, lng: 151.2093, label: 'Sydney', country: 'AU', visitors: 124, size: 0.7 },
  { lat: 52.5200, lng: 13.4050, label: 'Berlin', country: 'DE', visitors: 143, size: 0.8 },
  { lat: 43.6532, lng: -79.3832, label: 'Toronto', country: 'CA', visitors: 167, size: 0.8 },
  { lat: 19.4326, lng: -99.1332, label: 'Mexico City', country: 'MX', visitors: 234, size: 1.0 },
  { lat: 28.6139, lng: 77.2090, label: 'New Delhi', country: 'IN', visitors: 412, size: 1.3 },
  { lat: 37.5665, lng: 126.9780, label: 'Seoul', country: 'KR', visitors: 189, size: 0.9 },
  { lat: 55.7558, lng: 37.6173, label: 'Moscow', country: 'RU', visitors: 176, size: 0.9 },
  { lat: 1.3521, lng: 103.8198, label: 'Singapore', country: 'SG', visitors: 156, size: 0.8 },
  { lat: -34.6037, lng: -58.3816, label: 'Buenos Aires', country: 'AR', visitors: 134, size: 0.7 },
  { lat: 31.2304, lng: 121.4737, label: 'Shanghai', country: 'CN', visitors: 298, size: 1.1 }
];

export default function GlobeDemo() {
  const globeEl = useRef<any>(null);
  const [locations, setLocations] = useState(DEMO_LOCATIONS);
  const [arcs, setArcs] = useState<any[]>([]);

  useEffect(() => {
    // Initial globe setup
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.5;
      globeEl.current.pointOfView({ lat: 15, lng: -60, altitude: 2.5 });
    }

    // Create arcs between random points
    const generateArcs = () => {
      const newArcs = [];
      for (let i = 0; i < 5; i++) {
        const startIdx = Math.floor(Math.random() * DEMO_LOCATIONS.length);
        const endIdx = Math.floor(Math.random() * DEMO_LOCATIONS.length);
        if (startIdx !== endIdx) {
          newArcs.push({
            startLat: DEMO_LOCATIONS[startIdx].lat,
            startLng: DEMO_LOCATIONS[startIdx].lng,
            endLat: DEMO_LOCATIONS[endIdx].lat,
            endLng: DEMO_LOCATIONS[endIdx].lng,
            color: ['#ff00ff', '#00ffff', '#ffff00', '#ff00aa'][Math.floor(Math.random() * 4)]
          });
        }
      }
      setArcs(newArcs);
    };

    generateArcs();
    const arcInterval = setInterval(generateArcs, 4000);

    // Simulate live data updates
    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const randomLocation = DEMO_LOCATIONS[Math.floor(Math.random() * DEMO_LOCATIONS.length)];
        const newPoint = {
          ...randomLocation,
          lat: randomLocation.lat + (Math.random() - 0.5) * 2,
          lng: randomLocation.lng + (Math.random() - 0.5) * 2,
          size: Math.random() * 0.5 + 0.5,
          color: '#10b981'
        };
        
        setLocations(prev => {
          const updated = [...prev];
          // Keep only last 20 points to avoid overcrowding
          if (updated.length > 20) {
            updated.shift();
          }
          updated.push(newPoint);
          return updated;
        });

        // Remove the new point after 2 seconds
        setTimeout(() => {
          setLocations(prev => prev.filter(p => p !== newPoint));
        }, 2000);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      clearInterval(arcInterval);
    };
  }, []);

  return (
    <GlobeWrapper>
      <GlobeErrorBoundary>
        <Suspense fallback={<GlobeFallback />}>
          <Globe
          ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        // Points layer
        pointsData={locations}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => '#ff00ff'}
        pointAltitude={0.02}
        pointRadius={d => (d as LocationData).size || 0.8}
        pointLabel={d => `
          <div style="
            background: rgba(0,0,0,0.8);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #8b5cf6;
            font-size: 12px;
          ">
            <div style="color: #8b5cf6; font-weight: 600;">${(d as LocationData).label}</div>
            <div style="color: #fff; margin-top: 4px;">
              ${(d as LocationData).visitors || Math.floor(Math.random() * 500)} visitors
            </div>
          </div>
        `}
        
        // Arcs layer
        arcsData={arcs}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={0.5}
        
        // Atmosphere
        atmosphereColor="#ff00ff"
        atmosphereAltitude={0.15}
        
        // Controls
        enablePointerInteraction={true}
        width={undefined}
        height={undefined}
      />
        </Suspense>
      </GlobeErrorBoundary>
    </GlobeWrapper>
  );
}