import React, { useEffect, useRef } from 'react';

interface GoldenEnergyOrbProps {
  active?: boolean;
  pulsing?: boolean;
  intensity?: number;
  size?: number;
  onClick?: () => void;
  statusText?: string;
}

interface Particle {
  theta: number;
  phi: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  color: string;
}

export const GoldenEnergyOrb: React.FC<GoldenEnergyOrbProps> = ({
  active = true,
  pulsing = true,
  intensity = 0.5,
  size = 280,
  onClick,
  statusText = "Tap to Broadcast Alert"
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = size;
    const height = size;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Initialize 3D orbital particle swarm
    const particleCount = 75;
    const particles: Particle[] = [];
    const colors = [
      '#ffffff',
      '#fff5cb',
      '#ffd54f',
      '#f5ba42',
      '#fb923c',
      '#f97316'
    ];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        theta: Math.random() * Math.PI * 2,
        phi: (Math.random() - 0.5) * Math.PI,
        radius: 50 + Math.random() * 55,
        speed: 0.008 + Math.random() * 0.015,
        size: 1.2 + Math.random() * 2.8,
        alpha: 0.3 + Math.random() * 0.7,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    particlesRef.current = particles;

    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Outer atmospheric pulsing glow
      const pulse = pulsing ? Math.sin(time * 2.5) * 6 : 0;
      const glowRadius = 80 + pulse + intensity * 15;

      const outerGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, glowRadius + 35);
      outerGrad.addColorStop(0, 'rgba(255, 215, 100, 0.45)');
      outerGrad.addColorStop(0.3, 'rgba(245, 186, 66, 0.25)');
      outerGrad.addColorStop(0.65, 'rgba(217, 119, 6, 0.12)');
      outerGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');

      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius + 35, 0, Math.PI * 2);
      ctx.fill();

      // Rotating holographic 3D energy rings
      ctx.save();
      ctx.translate(cx, cy);

      // Ring 1 (Slanted horizontal)
      ctx.save();
      ctx.rotate(time * 0.4);
      ctx.scale(1, 0.38);
      ctx.beginPath();
      ctx.arc(0, 0, 82 + Math.sin(time) * 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.65)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.stroke();
      ctx.restore();

      // Ring 2 (Counter-rotating vertical slant)
      ctx.save();
      ctx.rotate(-time * 0.6 + 1);
      ctx.scale(0.42, 1);
      ctx.beginPath();
      ctx.arc(0, 0, 78, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 240, 180, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 10, 16, 8]);
      ctx.stroke();
      ctx.restore();

      // Ring 3 (Equatorial golden halo)
      ctx.save();
      ctx.rotate(time * 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, 94 + pulse * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 186, 66, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      ctx.restore();

      // Orbital 3D Particle Swarm
      particles.forEach((p) => {
        p.theta += p.speed;
        p.phi += p.speed * 0.4;

        // 3D Sphere projection
        const r = p.radius + Math.sin(time + p.theta) * 4;
        const x = cx + r * Math.cos(p.theta) * Math.cos(p.phi);
        const y = cy + r * Math.sin(p.phi);
        const z = r * Math.sin(p.theta) * Math.cos(p.phi);

        // Perspective scale & alpha based on depth
        const scale = (z + 120) / 240;
        const radius = Math.max(0.8, p.size * scale);
        const alpha = Math.max(0.1, p.alpha * scale);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      });

      // Core Solid Radiant Energy Sphere
      const coreRadius = 42 + pulse * 0.6;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.2, '#fff7cd');
      coreGrad.addColorStop(0.55, '#f5ba42');
      coreGrad.addColorStop(0.85, '#d97706');
      coreGrad.addColorStop(1, 'rgba(180, 83, 9, 0)');

      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowColor = 'rgba(245, 186, 66, 0.9)';
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner White Fusion Core
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [size, pulsing, intensity]);

  return (
    <div 
      className="flex flex-col items-center justify-center relative cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="transition-transform duration-300 group-hover:scale-105 active:scale-95"
      />
      
      {statusText && (
        <div className="mt-2 text-center">
          <span className="text-xs font-bold text-amber-300 tracking-wider uppercase px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-lg">
            {statusText}
          </span>
        </div>
      )}
    </div>
  );
};
