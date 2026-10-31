import React, { useEffect, useRef } from 'react';

interface Node {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  type: 'core' | 'node' | 'threat';
  angle: number;
  orbitRadius: number;
  speed: number;
  phase: number;
}

interface Connection {
  from: string;
  to: string;
  active: boolean;
  threat?: boolean;
}

export default function NetworkVisualization3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    const cx = () => W() / 2;
    const cy = () => H() / 2;

    const nodes: Node[] = [
      { id: 'core', x: 0, y: 0, radius: 22, color: '#06b6d4', label: 'SecureMesh', type: 'core', angle: 0, orbitRadius: 0, speed: 0, phase: 0 },
      { id: 'auth', x: 0, y: 0, radius: 12, color: '#3b82f6', label: 'Auth', type: 'node', angle: 0, orbitRadius: 100, speed: 0.008, phase: 0 },
      { id: 'db', x: 0, y: 0, radius: 11, color: '#8b5cf6', label: 'DB', type: 'node', angle: 0, orbitRadius: 100, speed: 0.008, phase: Math.PI * 2 / 5 },
      { id: 'api', x: 0, y: 0, radius: 10, color: '#06b6d4', label: 'API', type: 'node', angle: 0, orbitRadius: 100, speed: 0.008, phase: Math.PI * 4 / 5 },
      { id: 'fw', x: 0, y: 0, radius: 10, color: '#10b981', label: 'Firewall', type: 'node', angle: 0, orbitRadius: 100, speed: 0.008, phase: Math.PI * 6 / 5 },
      { id: 'ws', x: 0, y: 0, radius: 9, color: '#22d3ee', label: 'Web', type: 'node', angle: 0, orbitRadius: 100, speed: 0.008, phase: Math.PI * 8 / 5 },
      { id: 'device1', x: 0, y: 0, radius: 8, color: '#60a5fa', label: 'Device', type: 'node', angle: 0, orbitRadius: 170, speed: 0.005, phase: 0.3 },
      { id: 'device2', x: 0, y: 0, radius: 8, color: '#60a5fa', label: 'Device', type: 'node', angle: 0, orbitRadius: 170, speed: 0.005, phase: 1.5 },
      { id: 'device3', x: 0, y: 0, radius: 7, color: '#a78bfa', label: 'SIEM', type: 'node', angle: 0, orbitRadius: 170, speed: 0.005, phase: 2.8 },
      { id: 'device4', x: 0, y: 0, radius: 7, color: '#34d399', label: 'Backup', type: 'node', angle: 0, orbitRadius: 170, speed: 0.005, phase: 4.2 },
      { id: 'threat1', x: 0, y: 0, radius: 6, color: '#ef4444', label: '!', type: 'threat', angle: 0, orbitRadius: 210, speed: 0.012, phase: 1.0 },
      { id: 'threat2', x: 0, y: 0, radius: 5, color: '#f59e0b', label: '?', type: 'threat', angle: 0, orbitRadius: 230, speed: -0.007, phase: 3.5 },
    ];

    const connections: Connection[] = [
      { from: 'core', to: 'auth', active: true },
      { from: 'core', to: 'db', active: true },
      { from: 'core', to: 'api', active: true },
      { from: 'core', to: 'fw', active: true },
      { from: 'core', to: 'ws', active: true },
      { from: 'auth', to: 'device1', active: true },
      { from: 'auth', to: 'device2', active: true },
      { from: 'api', to: 'ws', active: true },
      { from: 'fw', to: 'device3', active: true },
      { from: 'db', to: 'device4', active: true },
      { from: 'threat1', to: 'fw', active: true, threat: true },
      { from: 'threat2', to: 'api', active: true, threat: true },
    ];

    // Particles
    const particles: Array<{x: number; y: number; alpha: number; speed: number; angle: number; size: number}> = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 250;
      particles.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        alpha: Math.random(),
        speed: 0.003 + Math.random() * 0.005,
        angle,
        size: 0.5 + Math.random() * 1.5,
      });
    }

    // Data packets on connections
    const packets: Array<{connection: typeof connections[0]; t: number; speed: number; color: string}> = [];
    connections.filter(c => !c.threat).forEach(conn => {
      if (Math.random() > 0.3) {
        packets.push({ connection: conn, t: Math.random(), speed: 0.003 + Math.random() * 0.006, color: '#22d3ee' });
      }
    });

    function getNodeById(id: string): Node | undefined {
      return nodes.find(n => n.id === id);
    }

    function draw() {
      if (!ctx || !canvas) return;
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      timeRef.current += 0.016;
      const t = timeRef.current;

      // Update node positions
      nodes.forEach(node => {
        if (node.type === 'core') {
          node.x = cx();
          node.y = cy();
        } else {
          node.angle = t * node.speed + node.phase;
          const wobble = node.orbitRadius + Math.sin(t * 0.3 + node.phase) * 5;
          node.x = cx() + Math.cos(node.angle) * wobble;
          node.y = cy() + Math.sin(node.angle) * wobble;
        }
      });

      // Draw orbit rings
      [100, 170, 220].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx(), cy(), r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.04 - i * 0.01})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw connections
      connections.forEach(conn => {
        const from = getNodeById(conn.from);
        const to = getNodeById(conn.to);
        if (!from || !to) return;

        const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        if (conn.threat) {
          grad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
          grad.addColorStop(1, 'rgba(239, 68, 68, 0.05)');
        } else {
          grad.addColorStop(0, 'rgba(34, 211, 238, 0.3)');
          grad.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
        }

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = conn.threat ? 1.5 : 1;
        ctx.stroke();
      });

      // Draw data packets
      packets.forEach(p => {
        p.t += p.speed;
        if (p.t > 1) p.t = 0;
        const from = getNodeById(p.connection.from);
        const to = getNodeById(p.connection.to);
        if (!from || !to) return;
        const px = from.x + (to.x - from.x) * p.t;
        const py = from.y + (to.y - from.y) * p.t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach(node => {
        // Glow
        if (node.type !== 'threat') {
          const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
          glow.addColorStop(0, node.color + '30');
          glow.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        // Body
        const bodyGrad = ctx.createRadialGradient(
          node.x - node.radius * 0.3, node.y - node.radius * 0.3, 0,
          node.x, node.y, node.radius
        );

        if (node.type === 'core') {
          bodyGrad.addColorStop(0, '#22d3ee');
          bodyGrad.addColorStop(1, '#0891b2');
          // Rotating ring
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, t * 1.5, t * 1.5 + Math.PI * 1.5);
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 14, -t * 0.8, -t * 0.8 + Math.PI);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else if (node.type === 'threat') {
          const threatPulse = Math.sin(t * 4) * 0.5 + 0.5;
          bodyGrad.addColorStop(0, '#f87171');
          bodyGrad.addColorStop(1, '#dc2626');
          // Threat pulse ring
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + threatPulse * 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 - threatPulse * 0.4})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          const r = parseInt(node.color.slice(1, 3), 16);
          const g = parseInt(node.color.slice(3, 5), 16);
          const b = parseInt(node.color.slice(5, 7), 16);
          bodyGrad.addColorStop(0, `rgba(${Math.min(r + 40, 255)}, ${Math.min(g + 40, 255)}, ${Math.min(b + 40, 255)}, 1)`);
          bodyGrad.addColorStop(1, node.color);
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.strokeStyle = node.type === 'threat' ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label (only for larger nodes)
        if (node.radius >= 10 || node.type === 'core') {
          ctx.font = `${node.type === 'core' ? 600 : 500} ${node.type === 'core' ? 8 : 7}px Inter`;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, node.x, node.y);
        }
      });

      // Particles
      particles.forEach(p => {
        p.alpha += p.speed * (Math.random() > 0.5 ? 1 : -1);
        p.alpha = Math.max(0.05, Math.min(0.8, p.alpha));
        ctx.beginPath();
        ctx.arc(cx() + p.x, cy() + p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(34, 211, 238, ${p.alpha * 0.4})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      <div style={{
        position: 'absolute',
        bottom: '12px',
        left: '12px',
        display: 'flex',
        gap: '16px',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan-500)', display: 'inline-block' }} />
          Secure Node
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red-500)', display: 'inline-block' }} />
          Threat Signal
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan-400)', display: 'inline-block' }} />
          Data Packet
        </span>
      </div>
    </div>
  );
}
