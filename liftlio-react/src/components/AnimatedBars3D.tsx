import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Canvas = styled.canvas`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.25;
  pointer-events: none;
  z-index: 0;
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
      canvas.height = canvas.offsetHeight || 800;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    let animationId: number;
    let time = 0;

    // Ultra minimalista - apenas mesh gradient sutil (Apple/Stripe style)
    const draw = () => {
      time += 0.0003; // MUITO lento = sofisticado

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 3;

      // Gradient orb 1 - roxo primário (movimento lento)
      const x1 = centerX + Math.sin(time) * 150;
      const y1 = centerY + Math.cos(time * 0.7) * 100;
      const gradient1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, 500);
      gradient1.addColorStop(0, 'rgba(139, 92, 246, 0.12)'); // #8b5cf6
      gradient1.addColorStop(0.5, 'rgba(139, 92, 246, 0.04)');
      gradient1.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gradient orb 2 - roxo claro (movimento oposto)
      const x2 = centerX - Math.sin(time * 0.8) * 200;
      const y2 = centerY - Math.cos(time) * 120;
      const gradient2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, 550);
      gradient2.addColorStop(0, 'rgba(168, 85, 247, 0.08)'); // #a855f7
      gradient2.addColorStop(0.5, 'rgba(168, 85, 247, 0.03)');
      gradient2.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gradient orb 3 - azul-roxo (diagonal)
      const x3 = centerX + Math.cos(time * 1.1) * 170;
      const y3 = centerY + Math.sin(time * 0.9) * 140;
      const gradient3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, 450);
      gradient3.addColorStop(0, 'rgba(124, 58, 237, 0.06)'); // #7c3aed
      gradient3.addColorStop(0.5, 'rgba(124, 58, 237, 0.02)');
      gradient3.addColorStop(1, 'rgba(124, 58, 237, 0)');
      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationId = requestAnimationFrame(draw);
    };

    // Start animation
    draw();

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <Canvas ref={canvasRef} />;
};

export default AnimatedBars3D;
