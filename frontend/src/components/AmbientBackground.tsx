import React, { useEffect, useRef } from 'react';

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: width * 0.5, y: height * 0.5, targetX: width * 0.5, targetY: height * 0.5 };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Floating Bokeh Orbs
    const orbs = [
      { x: width * 0.2, y: height * 0.25, vx: 0.35, vy: 0.25, radius: 450, color: 'rgba(6, 182, 212, 0.42)', baseRadius: 450 }, // Electric Cyan
      { x: width * 0.82, y: height * 0.2, vx: -0.3, vy: 0.35, radius: 520, color: 'rgba(168, 85, 247, 0.38)', baseRadius: 520 }, // Royal Violet
      { x: width * 0.5, y: height * 0.65, vx: 0.25, vy: -0.3, radius: 500, color: 'rgba(236, 72, 153, 0.32)', baseRadius: 500 }, // Neon Fuchsia
      { x: width * 0.15, y: height * 0.85, vx: 0.3, vy: -0.2, radius: 440, color: 'rgba(16, 185, 129, 0.28)', baseRadius: 440 }, // Emerald
      { x: width * 0.85, y: height * 0.8, vx: -0.35, vy: -0.25, radius: 480, color: 'rgba(59, 130, 246, 0.35)', baseRadius: 480 }, // Deep Azure
    ];

    // Soft glowing stardust embers (completely line-free)
    const embers: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      pulseSpeed: number;
      pulseOffset: number;
    }> = [];

    const emberColors = [
      'rgba(34, 211, 238,', // Cyan
      'rgba(244, 114, 182,', // Pink
      'rgba(192, 132, 252,', // Violet
      'rgba(110, 231, 183,', // Emerald
      'rgba(253, 224, 71,',  // Gold
    ];

    for (let i = 0; i < 70; i++) {
      embers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3 - 0.1, // gentle upward drift
        size: Math.random() * 2.2 + 0.8,
        color: emberColors[Math.floor(Math.random() * emberColors.length)],
        alpha: Math.random() * 0.6 + 0.2,
        pulseSpeed: 0.015 + Math.random() * 0.02,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    // Fluid Silk Wave Definition
    const waveLayers = [
      { freq: 0.0018, speed: 0.012, amp: 70, yOffset: 0.62, color1: 'rgba(6, 182, 212, 0.18)', color2: 'rgba(124, 58, 237, 0.02)' },
      { freq: 0.0024, speed: -0.015, amp: 85, yOffset: 0.72, color1: 'rgba(236, 72, 153, 0.15)', color2: 'rgba(59, 130, 246, 0.02)' },
      { freq: 0.0014, speed: 0.009, amp: 100, yOffset: 0.82, color1: 'rgba(139, 92, 246, 0.16)', color2: 'rgba(16, 185, 129, 0.01)' },
    ];

    const render = () => {
      time += 0.012;

      // Mouse smooth lerp
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Deep, velvety cosmic gradient foundation
      const bgGrad = ctx.createRadialGradient(
        width * 0.5, height * 0.3, 0,
        width * 0.5, height * 0.5, Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, '#090520');
      bgGrad.addColorStop(0.45, '#050215');
      bgGrad.addColorStop(0.85, '#030010');
      bgGrad.addColorStop(1, '#02000a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 1. Draw Organic Glowing Orbs (Screen blended)
      ctx.globalCompositeOperation = 'screen';

      orbs.forEach(orb => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        // Bounce gently inside boundary
        if (orb.x < -150 || orb.x > width + 150) orb.vx *= -1;
        if (orb.y < -150 || orb.y > height + 150) orb.vy *= -1;

        // Mouse repulsion / attraction
        const dx = mouse.x - orb.x;
        const dy = mouse.y - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 400) {
          orb.x -= (dx / dist) * 0.8;
          orb.y -= (dy / dist) * 0.8;
        }

        const pulseRad = orb.baseRadius + Math.sin(time * 0.8 + orb.x * 0.005) * 45;
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, Math.max(pulseRad, 10));
        grad.addColorStop(0, orb.color);
        grad.addColorStop(0.5, orb.color.replace('0.42', '0.16').replace('0.38', '0.14').replace('0.32', '0.12').replace('0.28', '0.09').replace('0.35', '0.12'));
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, pulseRad, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Silky Smooth Liquid Aurora Waves (Line-free, pure flowing ribbons)
      waveLayers.forEach(wave => {
        ctx.beginPath();
        ctx.moveTo(0, height);

        const baseY = height * wave.yOffset;

        for (let x = 0; x <= width; x += 15) {
          // Combined harmonic waves
          const wave1 = Math.sin(x * wave.freq + time * wave.speed * 80) * wave.amp;
          const wave2 = Math.cos(x * wave.freq * 1.5 - time * wave.speed * 60) * (wave.amp * 0.4);
          
          // Subtle mouse wave deformation
          const distToMouse = Math.abs(x - mouse.x);
          const mouseDeform = distToMouse < 250 ? Math.cos((distToMouse / 250) * (Math.PI / 2)) * 30 : 0;

          const y = baseY + wave1 + wave2 + mouseDeform;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, baseY - wave.amp, 0, height);
        waveGrad.addColorStop(0, wave.color1);
        waveGrad.addColorStop(1, wave.color2);
        ctx.fillStyle = waveGrad;
        ctx.fill();
      });

      // 3. Draw Soft Bokeh Floating Embers (No harsh lines, radiant optical dots)
      ctx.globalCompositeOperation = 'lighter';

      embers.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around smoothly
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const pulse = Math.sin(time * 2 + p.pulseOffset);
        const currentAlpha = Math.max(0.1, p.alpha + pulse * 0.25);
        const currentSize = Math.max(0.5, p.size + pulse * 0.5);

        // Core dot
        ctx.fillStyle = `${p.color} ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fill();

        // Outer diffused glow aura
        ctx.fillStyle = `${p.color} ${currentAlpha * 0.25})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalCompositeOperation = 'source-over';
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="ambient-background-layer" aria-hidden="true">
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
    </div>
  );
}
