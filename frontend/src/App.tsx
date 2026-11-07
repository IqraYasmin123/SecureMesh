import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/Login';
import OverviewPage from './pages/Overview';
import IdentityPage from './pages/Identity';
import ZeroTrustPage from './pages/ZeroTrust';
import RiskPage from './pages/Risk';
import ThreatsPage from './pages/Threats';
import NetworkPage from './pages/Network';
import CryptoPage from './pages/Crypto';
import IncidentsPage from './pages/Incidents';
import AuditPage from './pages/Audit';
import ReportsPage from './pages/Reports';
import SettingsPage from './pages/Settings';
import { MPCSecretSharingStudio } from './components/MPCSecretSharingStudio';
import { AutonomousAgentConsole } from './components/AutonomousAgentConsole';
import { RoleBadge } from './components/Badges';
import { Bell, Clock } from 'lucide-react';
import { getSummary } from './api/client';

import AmbientBackground from './components/AmbientBackground';
import CyberCursor from './components/CyberCursor';

function AppContent() {
  const { user, token, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('overview');
  const [openAlertsCount, setOpenAlertsCount] = useState<number | null>(null);
  const [time, setTime] = useState('');

  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (token) {
      getSummary()
        .then(res => setOpenAlertsCount(res.data?.open_alerts ?? 0))
        .catch(() => {});
    }
  }, [token, currentPage]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--void-black)',
        color: 'var(--cyan-400)',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        position: 'relative',
      }}>
        <AmbientBackground />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 1 }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: '3px solid rgba(6, 182, 212, 0.2)',
            borderTopColor: 'var(--cyan-400)',
            boxShadow: '0 0 24px var(--cyan-glow)',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Initializing SecureMesh Zero-Trust Core...
          </div>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      {/* Animated Glowing Cyber Background */}
      <AmbientBackground />

      {/* Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="status-dot online" />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Zero-Trust Guard: <strong style={{ color: 'var(--green-400)' }}>ENFORCED</strong>
            </span>
            <span style={{ color: 'var(--glass-border)', margin: '0 4px' }}>|</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} />
              {time} UTC
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Quick alert badge */}
            <button
              onClick={() => setCurrentPage('threats')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: openAlertsCount && openAlertsCount > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(13, 31, 58, 0.6)',
                border: openAlertsCount && openAlertsCount > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-md)',
                color: openAlertsCount && openAlertsCount > 0 ? 'var(--red-400)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <Bell size={14} />
              <span>{openAlertsCount ?? 0} Alerts</span>
            </button>

            {/* Active user role */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RoleBadge role={user.role} />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                {user.username}
              </span>
            </div>
          </div>
        </header>

        {/* Dynamic Page Rendering */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {currentPage === 'overview' && <OverviewPage />}
          {currentPage === 'identity' && <IdentityPage />}
          {currentPage === 'zerotrust' && <ZeroTrustPage />}
          {currentPage === 'risk' && <RiskPage />}
          {currentPage === 'threats' && <ThreatsPage />}
          {currentPage === 'network' && <NetworkPage />}
          
          {/* Hackathon Specialized Tracks */}
          {currentPage === 'mpc' && <MPCSecretSharingStudio />}
          {currentPage === 'agent' && <AutonomousAgentConsole />}

          {currentPage === 'crypto' && <CryptoPage />}
          {currentPage === 'incidents' && <IncidentsPage />}
          {currentPage === 'audit' && <AuditPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'settings' && <SettingsPage />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CyberCursor />
      <AppContent />
    </AuthProvider>
  );
}
