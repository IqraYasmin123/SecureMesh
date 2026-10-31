import React, { useState, useEffect, useRef } from 'react';
import { Move, RotateCcw, Zap, Compass } from 'lucide-react';

interface HackerMoveableMeshProps {
  loginCardRef?: React.RefObject<HTMLDivElement | null>;
}

const GLYPHS = '0123456789ABCDEF!@#$%^&*<>~[]{}/*+=_?';

export default function HackerMoveableMesh({ loginCardRef }: HackerMoveableMeshProps) {
  // Position offsets relative to initial anchor
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [scrambledSecure, setScrambledSecure] = useState('SECURE');
  const [scrambledMesh, setScrambledMesh] = useState('MESH');
  const [hovered, setHovered] = useState(false);

  // Drag tracking refs
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const autoVelocity = useRef({ vx: 1.8, vy: 1.2 });
  const autoPos = useRef({ x: 0, y: 0 });

  // Tether points for SVG laser beam
  const [tether, setTether] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Scramble effect
  const triggerScramble = (duration = 600) => {
    setGlitchActive(true);
    const originalSecure = 'SECURE';
    const originalMesh = 'MESH';
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(1, elapsed / duration);

      if (progress >= 1) {
        setScrambledSecure(originalSecure);
        setScrambledMesh(originalMesh);
        setGlitchActive(false);
        clearInterval(interval);
        return;
      }

      // Progressively resolve characters from left to right
      const secureResolved = Math.floor(progress * originalSecure.length);
      const meshResolved = Math.floor(progress * originalMesh.length);

      const secStr = originalSecure
        .split('')
        .map((char, i) => (i <= secureResolved ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('');

      const meshStr = originalMesh
        .split('')
        .map((char, i) => (i <= meshResolved ? char : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join('');

      setScrambledSecure(secStr);
      setScrambledMesh(meshStr);
    }, 45);
  };

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setIsAutonomous(false);
    triggerScramble(400);

    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      posX: pos.x,
      posY: pos.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    const newX = dragStart.current.posX + dx;
    const newY = dragStart.current.posY + dy;

    setPos({ x: newX, y: newY });
    autoPos.current = { x: newX, y: newY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsAutonomous(false);
    setPos({ x: 0, y: 0 });
    autoPos.current = { x: 0, y: 0 };
    triggerScramble(500);
  };

  // Autonomous Roam Mode
  useEffect(() => {
    if (!isAutonomous) return;

    let animId = 0;
    const step = () => {
      const maxX = window.innerWidth / 2 - 160;
      const maxY = window.innerHeight / 2 - 140;

      let nextX = autoPos.current.x + autoVelocity.current.vx;
      let nextY = autoPos.current.y + autoVelocity.current.vy;

      if (Math.abs(nextX) > maxX) {
        autoVelocity.current.vx *= -1;
        triggerScramble(300);
      }
      if (Math.abs(nextY) > maxY) {
        autoVelocity.current.vy *= -1;
        triggerScramble(300);
      }

      autoPos.current = { x: nextX, y: nextY };
      setPos({ x: nextX, y: nextY });

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isAutonomous]);

  // Update SVG laser tether
  useEffect(() => {
    const updateTether = () => {
      if (!containerRef.current) return;
      const titleRect = containerRef.current.getBoundingClientRect();
      const x1 = titleRect.left + titleRect.width / 2;
      const y1 = titleRect.bottom - 8;

      let x2 = window.innerWidth / 2;
      let y2 = window.innerHeight / 2;

      if (loginCardRef && loginCardRef.current) {
        const cardRect = loginCardRef.current.getBoundingClientRect();
        x2 = cardRect.left + cardRect.width / 2;
        y2 = cardRect.top + 16;
      }

      setTether({ x1, y1, x2, y2 });
    };

    updateTether();
    const id = setInterval(updateTether, 50);
    return () => clearInterval(id);
  }, [pos, loginCardRef]);

  // Distance from origin
  const dist = Math.hypot(pos.x, pos.y);
  const isDetached = dist > 20;

  return (
    <>
      {/* 1. Holographic Cyber Tether (Laser link between title & login card) */}
      {tether && isDetached && (
        <svg
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <defs>
            <linearGradient id="cyberLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
            </linearGradient>
            <filter id="laserGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glowing laser line */}
          <line
            x1={tether.x1}
            y1={tether.y1}
            x2={tether.x2}
            y2={tether.y2}
            stroke="url(#cyberLaserGrad)"
            strokeWidth="2.5"
            strokeDasharray="6 4"
            filter="url(#laserGlow)"
            style={{ animation: 'laserPulse 1s linear infinite' }}
          />

          {/* Tether status label */}
          <text
            x={(tether.x1 + tether.x2) / 2 + 10}
            y={(tether.y1 + tether.y2) / 2}
            fill="#22d3ee"
            fontSize="10"
            fontFamily="'JetBrains Mono', monospace"
            letterSpacing="0.1em"
            opacity="0.85"
          >
            [TETHER_LINK: {Math.round(dist)}px // SECURE]
          </text>
        </svg>
      )}

      {/* 2. Moveable Hacker SecureMesh Node */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={() => handleReset()}
        style={{
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          willChange: 'transform',
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'inline-block',
          position: 'relative',
          userSelect: 'none',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 50,
          padding: '12px 18px',
          borderRadius: '12px',
          background: isDragging
            ? 'rgba(6, 182, 212, 0.14)'
            : hovered
            ? 'rgba(15, 23, 42, 0.65)'
            : 'rgba(15, 23, 42, 0.3)',
          border: isDragging
            ? '1.5px solid rgba(34, 211, 238, 0.8)'
            : hovered
            ? '1.5px solid rgba(34, 211, 238, 0.35)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: isDragging
            ? '0 0 35px rgba(34, 211, 238, 0.5), inset 0 0 15px rgba(34, 211, 238, 0.2)'
            : hovered
            ? '0 12px 28px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 211, 238, 0.25)'
            : 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Holographic Hacker Corner Brackets */}
        <span
          style={{
            position: 'absolute',
            top: -2,
            left: -2,
            width: 10,
            height: 10,
            borderTop: '2px solid #22d3ee',
            borderLeft: '2px solid #22d3ee',
          }}
        />
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderTop: '2px solid #22d3ee',
            borderRight: '2px solid #22d3ee',
          }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            left: -2,
            width: 10,
            height: 10,
            borderBottom: '2px solid #22d3ee',
            borderLeft: '2px solid #22d3ee',
          }}
        />
        <span
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 10,
            height: 10,
            borderBottom: '2px solid #22d3ee',
            borderRight: '2px solid #22d3ee',
          }}
        />

        {/* Top Hacker Telemetry Strip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 6,
            fontSize: '9.5px',
            fontFamily: "'JetBrains Mono', monospace",
            color: isDragging ? '#22d3ee' : '#94a3b8',
            letterSpacing: '0.08em',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Move size={10} color={isDragging ? '#22d3ee' : '#38bdf8'} />
            <span style={{ fontWeight: 600 }}>
              {isDragging
                ? '>> NODE_DETACHED_DRAGGING <<'
                : isAutonomous
                ? 'AUTONOMOUS_PATROL'
                : 'DRAG_TO_MOVE'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>
              X:{Math.round(pos.x).toString().padStart(4, '0')} Y:{Math.round(pos.y).toString().padStart(4, '0')}
            </span>

            {/* Quick Action Badges */}
            {isDetached && (
              <button
                type="button"
                onClick={handleReset}
                title="Reset Position (Double-click also resets)"
                style={{
                  background: 'rgba(34, 211, 238, 0.15)',
                  border: '1px solid rgba(34, 211, 238, 0.4)',
                  color: '#22d3ee',
                  padding: '1px 5px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: '9px',
                }}
              >
                <RotateCcw size={8} /> RESET
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAutonomous(!isAutonomous);
              }}
              title="Toggle Autonomous Roam"
              style={{
                background: isAutonomous ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                border: isAutonomous ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isAutonomous ? '#f472b6' : '#cbd5e1',
                padding: '1px 5px',
                borderRadius: 3,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontSize: '9px',
              }}
            >
              <Compass size={8} /> {isAutonomous ? 'ROAMING' : 'ROAM'}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerScramble(700);
              }}
              title="Trigger Hacker Glitch"
              style={{
                background: glitchActive ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                border: glitchActive ? '1px solid #f43f5e' : '1px solid rgba(255, 255, 255, 0.15)',
                color: glitchActive ? '#f43f5e' : '#cbd5e1',
                padding: '1px 5px',
                borderRadius: 3,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                fontSize: '9px',
              }}
            >
              <Zap size={8} /> GLITCH
            </button>
          </div>
        </div>

        {/* 3. Main Scrambled 3D Hacker Brand Name */}
        <h1
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
            fontSize: '2.75rem',
            fontWeight: 900,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: 0,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            textShadow: isDragging
              ? '0 0 20px #22d3ee, 0 0 40px rgba(34, 211, 238, 0.6)'
              : '0 0 16px rgba(34, 211, 238, 0.4)',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              letterSpacing: glitchActive ? '0.08em' : '0.04em',
              transition: 'letter-spacing 0.1s',
            }}
          >
            {scrambledSecure}
          </span>
          <span
            style={{
              color: '#22d3ee',
              letterSpacing: glitchActive ? '0.08em' : '0.04em',
              transition: 'letter-spacing 0.1s',
              textShadow: '0 0 25px rgba(34, 211, 238, 0.8), 0 0 50px rgba(6, 182, 212, 0.4)',
            }}
          >
            {scrambledMesh}
          </span>
        </h1>

        {/* Hacker Status Sub-bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 6,
            fontSize: '9px',
            fontFamily: "'JetBrains Mono', monospace",
            color: '#38bdf8',
            opacity: 0.8,
            letterSpacing: '0.12em',
          }}
        >
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 6px #34d399' }} />
          <span>ZERO-TRUST IDENTITY MESH</span>
          <span>•</span>
          <span style={{ color: '#ec4899' }}>SHA-256 HASH CHAIN</span>
        </div>
      </div>
    </>
  );
}
