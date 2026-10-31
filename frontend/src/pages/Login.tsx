import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import AmbientBackground from '../components/AmbientBackground';
import HackerMoveableMesh from '../components/HackerMoveableMesh';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginCardRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Login failed. Check credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Liquid Waves & Bokeh */}
      <AmbientBackground />

      <div style={{ width: '100%', maxWidth: 430, position: 'relative', zIndex: 1 }} className="animate-in">
        {/* Hacker 3D Moveable Title */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <HackerMoveableMesh loginCardRef={loginCardRef} />
        </div>

        {/* Compact Pure Glass Card */}
        <div ref={loginCardRef} className="glass" style={{
          padding: '22px 24px',
          background: 'rgba(12, 20, 42, 0.55)',
          boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <div style={{
            fontSize: '0.92rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <Lock size={15} color="var(--cyan-400)" />
            <span>Cryptographic Authentication</span>
          </div>

          {error && (
            <div className="error-banner" style={{ marginBottom: 12, padding: '8px 12px', fontSize: '0.78rem' }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 10 }}>
              <label className="input-label" style={{ marginBottom: 5, fontSize: '0.7rem' }}>Identity</label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                autoFocus
                style={{ padding: '8px 12px', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="input-label" style={{ marginBottom: 5, fontSize: '0.7rem' }}>Key / Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  style={{ padding: '8px 36px 8px 12px', fontSize: '0.82rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', padding: '9px 14px', fontSize: '0.82rem' }}
            >
              {loading ? 'Authenticating...' : 'Authenticate & Enter'}
              {!loading && <ArrowRight size={14} />}
            </button>
          </form>

          {/* Compact 3-Column Role Shortcuts */}
          <div style={{ marginTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 12 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Identity Profiles
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[
                { label: 'Admin', user: 'admin', pass: 'Admin@SecureMesh2024', color: '#c084fc' },
                { label: 'Analyst', user: 'analyst', pass: 'Analyst@SecureMesh2024', color: '#67e8f9' },
                { label: 'Viewer', user: 'viewer', pass: 'Viewer@SecureMesh2024', color: '#94a3b8' },
              ].map(cred => (
                <button
                  key={cred.user}
                  type="button"
                  onClick={() => quickLogin(cred.user, cred.pass)}
                  style={{
                    padding: '6px 8px',
                    background: 'rgba(5, 10, 24, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 150ms ease',
                    color: 'inherit',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.4)';
                    e.currentTarget.style.background = 'rgba(15, 25, 55, 0.8)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.background = 'rgba(5, 10, 24, 0.6)';
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: cred.color, fontWeight: 700 }}>{cred.label}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {cred.user}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 10, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          NIST SP 800-207 Zero-Trust Core · SHA-256 Tamper-Evident Ledger
        </p>
      </div>
    </div>
  );
}
