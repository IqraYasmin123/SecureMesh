import React, { useEffect, useRef, useState } from 'react';

/**
 * CyberCursor - Elite Cybersecurity Reticle & Targeting HUD Cursor
 * Replaces the default OS arrow with a high-tech hacker targeting system.
 */
export default function CyberCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [targetLabel, setTargetLabel] = useState<string | null>(null);
  const [coords, setCoords] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only enable custom cursor for precise pointer devices (desktop/mouse)
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let animId = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setVisible(true);

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      // Check if hovering an interactive element
      const target = e.target as HTMLElement | null;
      if (target) {
        const interactive = target.closest(
          'button, a, input, select, textarea, [role="button"], .interactive, .cursor-pointer, [data-interactive]'
        );
        if (interactive) {
          setHovered(true);
          const label = interactive.getAttribute('aria-label') ||
            (interactive.tagName === 'BUTTON' ? 'EXECUTE' :
             interactive.tagName === 'INPUT' ? 'INPUT_STREAM' :
             interactive.tagName === 'A' ? 'ACCESS_LINK' : 'TARGET');
          setTargetLabel(label);
        } else {
          setHovered(false);
          setTargetLabel(null);
        }
      }
    };

    const onMouseDown = () => {
      setClicked(true);
      setTimeout(() => setClicked(false), 240);
    };

    const onMouseLeave = () => {
      setVisible(false);
    };

    const onMouseEnter = () => {
      setVisible(true);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mousedown', onMouseDown, { passive: true });
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);

    let frame = 0;
    const animate = () => {
      frame++;
      // Smooth lerp for outer reticle ring
      const ease = 0.22;
      ringX += (mouseX - ringX) * ease;
      ringY += (mouseY - ringY) * ease;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }

      // Update coordinates display every 4 frames
      if (frame % 4 === 0) {
        setCoords({ x: Math.round(mouseX), y: Math.round(mouseY) });
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(animId);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999999,
        overflow: 'hidden',
      }}
    >
      {/* 1. Precise Laser Dot at Exact Mouse Position */}
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          top: -3,
          left: -3,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: clicked ? '#f43f5e' : hovered ? '#22d3ee' : '#38bdf8',
          boxShadow: clicked
            ? '0 0 14px #f43f5e, 0 0 28px #f43f5e'
            : hovered
            ? '0 0 12px #22d3ee, 0 0 22px #22d3ee'
            : '0 0 8px #38bdf8',
          transition: 'background 0.15s, box-shadow 0.15s, transform 0.04s ease-out',
          willChange: 'transform',
        }}
      />

      {/* 2. Cyber Reticle / Target Ring Tracking Smoothly */}
      <div
        ref={ringRef}
        style={{
          position: 'absolute',
          top: hovered ? -22 : -16,
          left: hovered ? -22 : -16,
          width: hovered ? 44 : 32,
          height: hovered ? 44 : 32,
          borderRadius: hovered ? '6px' : '50%',
          border: hovered
            ? '1.5px dashed rgba(34, 211, 238, 0.95)'
            : '1.5px solid rgba(56, 189, 248, 0.55)',
          boxShadow: hovered
            ? '0 0 18px rgba(34, 211, 238, 0.45), inset 0 0 12px rgba(34, 211, 238, 0.2)'
            : '0 0 10px rgba(56, 189, 248, 0.25)',
          transition:
            'width 0.18s cubic-bezier(0.16, 1, 0.3, 1), height 0.18s cubic-bezier(0.16, 1, 0.3, 1), top 0.18s, left 0.18s, border-radius 0.18s, border-color 0.18s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          willChange: 'transform',
          animation: hovered ? 'cyberRotate 6s linear infinite' : 'none',
        }}
      >
        {/* Corner Reticle Ticks when Hovering */}
        {hovered && (
          <>
            <span
              style={{
                position: 'absolute',
                top: -5,
                left: -5,
                width: 6,
                height: 6,
                borderTop: '2px solid #22d3ee',
                borderLeft: '2px solid #22d3ee',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                width: 6,
                height: 6,
                borderTop: '2px solid #22d3ee',
                borderRight: '2px solid #22d3ee',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: -5,
                left: -5,
                width: 6,
                height: 6,
                borderBottom: '2px solid #22d3ee',
                borderLeft: '2px solid #22d3ee',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: -5,
                right: -5,
                width: 6,
                height: 6,
                borderBottom: '2px solid #22d3ee',
                borderRight: '2px solid #22d3ee',
              }}
            />
          </>
        )}

        {/* Cyber Crosshair Ticks */}
        {!hovered && (
          <>
            <span
              style={{
                position: 'absolute',
                top: -4,
                width: 1,
                height: 4,
                background: '#38bdf8',
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: -4,
                width: 1,
                height: 4,
                background: '#38bdf8',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: -4,
                height: 1,
                width: 4,
                background: '#38bdf8',
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: -4,
                height: 1,
                width: 4,
                background: '#38bdf8',
              }}
            />
          </>
        )}

        {/* Dynamic Telemetry HUD Readout near Cursor */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              left: 36,
              top: -6,
              background: 'rgba(3, 7, 24, 0.88)',
              border: '1px solid rgba(34, 211, 238, 0.45)',
              padding: '2px 6px',
              borderRadius: 3,
              fontSize: '9px',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#22d3ee',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#22d3ee' }} />
            <span>{targetLabel || 'LOCK'}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              {coords.x},{coords.y}
            </span>
          </div>
        )}
      </div>

      {/* 3. Click Ping Ripple Effect */}
      {clicked && (
        <div
          style={{
            position: 'absolute',
            left: coords.x - 25,
            top: coords.y - 25,
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: '2px solid rgba(244, 63, 94, 0.85)',
            boxShadow: '0 0 20px rgba(244, 63, 94, 0.6)',
            animation: 'cyberPing 0.35s ease-out forwards',
          }}
        />
      )}
    </div>
  );
}
