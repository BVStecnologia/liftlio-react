import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import styled from 'styled-components';

const CanvasContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  opacity: 0.8;
`;

interface WaveParticles3DProps {
  particleCount?: number;
  color?: string;
}

const WaveParticles3D: React.FC<WaveParticles3DProps> = ({ 
  particleCount = 10000,
  color = '#6366f1' 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.offsetWidth / containerRef.current.offsetHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(containerRef.current.offsetWidth, containerRef.current.offsetHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create wave particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Store original positions for animation
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('originalPosition', new THREE.BufferAttribute(originalPositions, 3));

    // Material
    const material = new THREE.PointsMaterial({
      size: 0.08, // Partículas um pouco menores
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.35, // Opacidade reduzida de 0.6 para 0.35
      blending: THREE.AdditiveBlending,
    });

    // Create points mesh
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Store original X and Z positions
    const originalX = new Float32Array(particleCount);
    const originalZ = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      originalX[i] = originalPositions[i * 3];
      originalZ[i] = originalPositions[i * 3 + 2];
    }

    // Animation
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      
      // Animate wave - movimento mais lento como galáxia
      const positions = geometry.attributes.position.array as Float32Array;
      const time = Date.now() * 0.0003; // 3x mais lento, igual ao HTML
      
      for (let i = 0; i < particleCount; i++) {
        const x = originalX[i]; // Use original X
        const z = originalZ[i]; // Use original Z
        positions[i * 3 + 1] = Math.sin(x * 0.1 + time) * Math.cos(z * 0.1 + time) * 2;
      }
      
      geometry.attributes.position.needsUpdate = true;
      particles.rotation.y += 0.0002; // Rotação 5x mais lenta, como uma galáxia

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      
      camera.aspect = containerRef.current.offsetWidth / containerRef.current.offsetHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(
        containerRef.current.offsetWidth,
        containerRef.current.offsetHeight
      );
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
      if (rendererRef.current && containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (geometry) {
        geometry.dispose();
      }
      if (material) {
        material.dispose();
      }
      sceneRef.current = null;
      initializedRef.current = false; // Reset initialization flag
    };
  }, []); // Remove dependencies to prevent re-runs

  return <CanvasContainer ref={containerRef} />;
};

export default WaveParticles3D;