import React, { useEffect, useRef } from 'react';

interface GlassBlessingJarProps {
  fillPercentage: number; // 0 to 100
  amount: number;
}

export const GlassBlessingJar: React.FC<GlassBlessingJarProps> = ({
  fillPercentage,
  amount: _amount
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Smoothly interpolated fill percentage for organic liquid motion
  const currentFillRef = useRef(fillPercentage);

  useEffect(() => {
    currentFillRef.current = fillPercentage;
  }, [fillPercentage]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = 240;
    const height = 270;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    let step = 0;
    let smoothFill = currentFillRef.current;

    // Floating golden bubbles
    interface Bubble {
      x: number;
      y: number;
      radius: number;
      speed: number;
      alpha: number;
    }
    const bubbles: Bubble[] = Array.from({ length: 16 }, () => ({
      x: 35 + Math.random() * 170,
      y: 240 - Math.random() * 100,
      radius: 1.5 + Math.random() * 2.5,
      speed: 0.5 + Math.random() * 1.0,
      alpha: 0.3 + Math.random() * 0.6
    }));

    const render = () => {
      step += 0.04;
      ctx.clearRect(0, 0, width, height);

      // Smooth lerp fill towards target percentage
      smoothFill += (currentFillRef.current - smoothFill) * 0.08;
      const normalizedFill = Math.min(100, Math.max(0, smoothFill)) / 100;

      // Jar Interior Dimensions
      const jarX = 35;
      const jarY = 45;
      const jarW = 170;
      const jarH = 205;
      const jarRadius = 26;

      // Liquid base Y: 0% = jar bottom, 100% = jar cap neck
      const liquidTopY = (jarY + jarH) - (normalizedFill * (jarH - 12));

      // 1. Draw Jar Interior Clip Path for Liquid Wave
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(jarX, jarY, jarW, jarH, [0, 0, jarRadius, jarRadius]);
      ctx.clip();

      if (normalizedFill > 0.01) {
        // --- Golden Wave 1 (Deep Amber Background Wave) ---
        ctx.beginPath();
        ctx.moveTo(jarX, jarY + jarH);
        for (let x = jarX; x <= jarX + jarW; x += 4) {
          const waveHeight = Math.sin((x * 0.04) + step * 1.4) * 6 * Math.min(1, normalizedFill * 4);
          const y = liquidTopY + waveHeight + 4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(jarX + jarW, jarY + jarH);
        ctx.closePath();

        const backWaveGrad = ctx.createLinearGradient(jarX, liquidTopY, jarX, jarY + jarH);
        backWaveGrad.addColorStop(0, '#f59e0b');
        backWaveGrad.addColorStop(0.5, '#d97706');
        backWaveGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = backWaveGrad;
        ctx.globalAlpha = 0.65;
        ctx.fill();

        // --- Golden Wave 2 (Radiant Gold Foreground Wave) ---
        ctx.beginPath();
        ctx.moveTo(jarX, jarY + jarH);
        for (let x = jarX; x <= jarX + jarW; x += 4) {
          const waveHeight = Math.cos((x * 0.04) - step * 1.8) * 7 * Math.min(1, normalizedFill * 4);
          const y = liquidTopY + waveHeight;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(jarX + jarW, jarY + jarH);
        ctx.closePath();

        const frontWaveGrad = ctx.createLinearGradient(jarX, liquidTopY, jarX, jarY + jarH);
        frontWaveGrad.addColorStop(0, '#fef08a');
        frontWaveGrad.addColorStop(0.18, '#fbbf24');
        frontWaveGrad.addColorStop(0.65, '#f59e0b');
        frontWaveGrad.addColorStop(1, '#d97706');
        ctx.fillStyle = frontWaveGrad;
        ctx.globalAlpha = 0.95;
        ctx.fill();

        // Golden Wave Foam Crest Highlight line
        ctx.beginPath();
        for (let x = jarX; x <= jarX + jarW; x += 4) {
          const waveHeight = Math.cos((x * 0.04) - step * 1.8) * 7 * Math.min(1, normalizedFill * 4);
          const y = liquidTopY + waveHeight;
          if (x === jarX) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;
        ctx.stroke();

        // Floating Gold Sparkle Bubbles inside liquid
        bubbles.forEach((b) => {
          b.y -= b.speed;
          if (b.y < liquidTopY + 10) {
            b.y = jarY + jarH - 5;
            b.x = jarX + 15 + Math.random() * (jarW - 30);
          }
          if (b.y >= liquidTopY) {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = b.alpha * 0.8;
            ctx.fill();
          }
        });
      }

      ctx.restore(); // Restore clip

      // 2. Realistic Glass Jar Body Outline & Gloss Highlights
      ctx.save();

      // Jar Drop Shadow behind glass
      ctx.beginPath();
      ctx.ellipse(width / 2, jarY + jarH + 6, 65, 8, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.filter = 'blur(5px)';
      ctx.fill();
      ctx.filter = 'none';

      // Outer Glass Body Wall
      ctx.beginPath();
      ctx.roundRect(jarX, jarY, jarW, jarH, [0, 0, jarRadius, jarRadius]);
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Left Vertical Specular Glass Highlight Bar
      ctx.beginPath();
      ctx.moveTo(jarX + 12, jarY + 15);
      ctx.lineTo(jarX + 12, jarY + jarH - 25);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Secondary subtle thin reflection line
      ctx.beginPath();
      ctx.moveTo(jarX + 20, jarY + 25);
      ctx.lineTo(jarX + 20, jarY + jarH - 45);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Jar Neck & Sky Navy Cap
      const neckW = 115;
      const neckH = 12;
      const neckX = (width - neckW) / 2;
      const neckY = jarY - neckH + 2;

      // Neck glass ring
      ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
      ctx.roundRect(neckX, neckY, neckW, neckH, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cap / Lid
      const capW = 130;
      const capH = 20;
      const capX = (width - capW) / 2;
      const capY = neckY - capH + 4;

      const capGrad = ctx.createLinearGradient(capX, capY, capX, capY + capH);
      capGrad.addColorStop(0, '#334155');
      capGrad.addColorStop(0.5, '#1e293b');
      capGrad.addColorStop(1, '#0f172a');

      ctx.beginPath();
      ctx.roundRect(capX, capY, capW, capH, 6);
      ctx.fillStyle = capGrad;
      ctx.fill();

      // Cap Top Bevel Highlight
      ctx.beginPath();
      ctx.moveTo(capX + 6, capY + 2);
      ctx.lineTo(capX + capW - 6, capY + 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      <canvas
        ref={canvasRef}
        style={{ width: '240px', height: '270px' }}
        className="filter drop-shadow-[0_8px_20px_rgba(2,132,199,0.12)]"
      />
    </div>
  );
};

export default GlassBlessingJar;
