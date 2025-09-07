import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Canvas = styled.canvas`
  position: absolute;
  top: -550px;
  left: 0;
  width: 100%;
  height: calc(100% + 650px);
  opacity: 0.2;
  pointer-events: none;
  z-index: 0;
  filter: blur(35px);
`;

const AnimatedBars3D: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth || window.innerWidth;
      canvas.height = canvas.offsetHeight || 600;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Create bars
    const bars: any[] = [];
    const rows = 5;
    const cols = 10;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        bars.push({
          x: (canvas.width / (cols + 1)) * (col + 0.5),
          z: row * 50,
          height: 50 + Math.random() * 100,
          targetHeight: 50 + Math.random() * 150,
          speed: 0.02 + Math.random() * 0.02,
          hue: 260 + row * 8 + col * 4
        });
      }
    }

    let animationId: number;
    
    // Animation loop
    const draw = () => {
      // Clear with trail effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const baseY = canvas.height * 0.58;
      const perspective = 300;
      const vanishX = canvas.width / 2;
      const vanishY = canvas.height * 0.3;
      
      // Sort by depth
      const sorted = [...bars].sort((a, b) => b.z - a.z);
      
      sorted.forEach(bar => {
        // Animate height
        bar.height += (bar.targetHeight - bar.height) * bar.speed;
        if (Math.abs(bar.height - bar.targetHeight) < 1) {
          bar.targetHeight = 50 + Math.random() * 150;
        }
        
        // Calculate 3D position
        const scale = perspective / (perspective + bar.z);
        const projX = vanishX + (bar.x - vanishX) * scale;
        const projY = vanishY + (baseY - vanishY) * scale;
        const projHeight = bar.height * scale;
        const projWidth = 30 * scale;
        
        // Shadow
        ctx.fillStyle = `rgba(0, 0, 0, ${0.2 * scale})`;
        ctx.fillRect(projX + 2, projY - projHeight + 2, projWidth, projHeight);
        
        // Bar gradient
        const gradient = ctx.createLinearGradient(
          projX, projY,
          projX, projY - projHeight
        );
        gradient.addColorStop(0, `hsla(${bar.hue}, 70%, 50%, ${0.3 * scale})`);
        gradient.addColorStop(1, `hsla(${bar.hue}, 70%, 70%, ${0.6 * scale})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(projX, projY - projHeight, projWidth, projHeight);
        
        // 3D top face
        if (scale > 0.3) {
          ctx.fillStyle = `hsla(${bar.hue}, 70%, 80%, ${0.7 * scale})`;
          ctx.beginPath();
          ctx.moveTo(projX, projY - projHeight);
          ctx.lineTo(projX + projWidth, projY - projHeight);
          ctx.lineTo(projX + projWidth + 4 * scale, projY - projHeight - 4 * scale);
          ctx.lineTo(projX + 4 * scale, projY - projHeight - 4 * scale);
          ctx.closePath();
          ctx.fill();
          
          // Side face
          ctx.fillStyle = `hsla(${bar.hue}, 70%, 40%, ${0.5 * scale})`;
          ctx.beginPath();
          ctx.moveTo(projX + projWidth, projY - projHeight);
          ctx.lineTo(projX + projWidth, projY);
          ctx.lineTo(projX + projWidth + 4 * scale, projY - 4 * scale);
          ctx.lineTo(projX + projWidth + 4 * scale, projY - projHeight - 4 * scale);
          ctx.closePath();
          ctx.fill();
        }
      });
      
      animationId = requestAnimationFrame(draw);
    };
    
    // Start animation
    draw();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateSize);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return <Canvas ref={canvasRef} />;
};

export default AnimatedBars3D;