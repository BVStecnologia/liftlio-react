import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useTheme } from '../context/ThemeContext';
import COLORS from '../styles/colors';

interface TechBackgroundProps {
  className?: string;
  zIndex?: number;
  opacity?: number;
}

interface BackgroundContainerProps {
  zIndex?: number;
  opacity?: number;
}

const BackgroundContainer = styled.div<BackgroundContainerProps>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: ${props => props.zIndex || 0};
  opacity: ${props => props.opacity !== undefined ? props.opacity : 0.4};
  pointer-events: none;
`;

const TechBackground: React.FC<TechBackgroundProps> = ({ className, zIndex, opacity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isDarkMode } = useTheme();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas to full size
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Nodes that represent connection points
    const nodes: {
      x: number;
      y: number;
      size: number;
      connections: number[];
      speed: number;
      alpha: number;
      direction: number;
    }[] = [];
    
    // Create initial nodes
    const createNodes = () => {
      const nodeCount = Math.floor(canvas.width * canvas.height / 40000);
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 1,
          connections: [],
          speed: Math.random() * 0.2 + 0.1,
          alpha: Math.random() * 0.5 + 0.2,
          direction: Math.random() > 0.5 ? 1 : -1
        });
      }
    };
    
    // Create connections between nodes
    const createConnections = () => {
      const maxDistance = Math.min(canvas.width, canvas.height) / 3;
      nodes.forEach((node, i) => {
        node.connections = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          
          const distance = Math.sqrt(
            Math.pow(node.x - nodes[j].x, 2) + 
            Math.pow(node.y - nodes[j].y, 2)
          );
          
          if (distance < maxDistance && node.connections.length < 3) {
            node.connections.push(j);
          }
        }
      });
    };
    
    // Moving particles along lines
    const particles: {
      startNodeIndex: number;
      endNodeIndex: number;
      position: number;
      speed: number;
      size: number;
      alpha: number;
    }[] = [];
    
    const createParticles = () => {
      particles.length = 0;
      
      const particleCount = Math.floor(nodes.length / 2);
      for (let i = 0; i < particleCount; i++) {
        const startNodeIndex = Math.floor(Math.random() * nodes.length);
        const node = nodes[startNodeIndex];
        
        if (node.connections.length > 0) {
          const connectionIndex = Math.floor(Math.random() * node.connections.length);
          const endNodeIndex = node.connections[connectionIndex];
          
          particles.push({
            startNodeIndex,
            endNodeIndex,
            position: 0,
            speed: Math.random() * 0.01 + 0.005,
            size: Math.random() * 2 + 1,
            alpha: Math.random() * 0.7 + 0.3
          });
        }
      }
    };
    
    let mousePosition = { x: 0, y: 0, active: false };
    
    // Track mouse position for interactive effect
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mousePosition = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        active: true
      };
    };
    
    // Reset mouse tracking when mouse leaves
    const handleMouseLeave = () => {
      mousePosition.active = false;
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    createNodes();
    createConnections();
    createParticles();
    
    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw connections
      nodes.forEach((node, i) => {
        node.connections.forEach(connectedIndex => {
          const connectedNode = nodes[connectedIndex];
          
          // Draw line
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(connectedNode.x, connectedNode.y);
          
          // Get distance for opacity calculation
          const distance = Math.sqrt(
            Math.pow(node.x - connectedNode.x, 2) + 
            Math.pow(node.y - connectedNode.y, 2)
          );
          
          const maxDistance = Math.min(canvas.width, canvas.height) / 3;
          const opacity = 1 - (distance / maxDistance);
          
          // Set line style - adapt for dark mode
          const lineColor = isDarkMode ? '255, 255, 255' : '45, 62, 80';
          ctx.strokeStyle = `rgba(${lineColor}, ${opacity * 0.4})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });
      
      // Update and draw nodes
      nodes.forEach(node => {
        // Subtle movement
        node.y += node.speed * node.direction;
        
        // Reverse direction at boundaries
        if (node.y > canvas.height || node.y < 0) {
          node.direction *= -1;
        }
        
        // Mouse interaction
        if (mousePosition.active) {
          const dx = mousePosition.x - node.x;
          const dy = mousePosition.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            const angle = Math.atan2(dy, dx);
            node.x -= Math.cos(angle) * 0.5;
            node.y -= Math.sin(angle) * 0.5;
          }
        }
        
        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        const nodeColor = isDarkMode ? '255, 255, 255' : '52, 73, 94';
        ctx.fillStyle = `rgba(${nodeColor}, ${node.alpha})`;
        ctx.fill();
      });
      
      // Update and draw particles
      particles.forEach(particle => {
        const startNode = nodes[particle.startNodeIndex];
        const endNode = nodes[particle.endNodeIndex];
        
        // Update position
        particle.position += particle.speed;
        if (particle.position > 1) {
          particle.position = 0;
          
          // Possibly choose a new destination
          if (Math.random() > 0.7) {
            const node = nodes[particle.endNodeIndex];
            if (node.connections.length > 0) {
              const newConnectionIndex = Math.floor(Math.random() * node.connections.length);
              particle.startNodeIndex = particle.endNodeIndex;
              particle.endNodeIndex = node.connections[newConnectionIndex];
            }
          }
        }
        
        // Interpolate position
        const x = startNode.x + (endNode.x - startNode.x) * particle.position;
        const y = startNode.y + (endNode.y - startNode.y) * particle.position;
        
        // Draw particle
        ctx.beginPath();
        ctx.arc(x, y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 169, 219, ${particle.alpha})`;
        ctx.fill();
      });
      
      requestAnimationFrame(animate);
    };
    
    const animationId = requestAnimationFrame(animate);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, [isDarkMode]);
  
  return (
    <BackgroundContainer className={className} zIndex={zIndex} opacity={opacity}>
      <canvas ref={canvasRef} />
    </BackgroundContainer>
  );
};

export default TechBackground;