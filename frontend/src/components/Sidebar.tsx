import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, GitBranch, Activity, AlertTriangle,
  Network, Lock, FileText, BookOpen, Settings, LogOut, Zap,
  Share2, Bot
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Command Center', icon: LayoutDashboard, section: 'core' },
  { id: 'identity', label: 'Identity Governance', icon: Users, section: 'core' },
  { id: 'zerotrust', label: 'Zero-Trust Engine', icon: GitBranch, section: 'core' },
  
  // Advanced Security & Intelligence
  { id: 'agent', label: 'Autonomous Agent', icon: Bot, section: 'intelligence' },
  { id: 'mpc', label: 'Multi-Party Cryptography', icon: Share2, section: 'intelligence' },
  { id: 'crypto', label: 'Cryptographic Operations', icon: Lock, section: 'intelligence' },

  // Surveillance & Analysis
  { id: 'threats', label: 'Threat Intelligence', icon: AlertTriangle, section: 'monitoring' },
  { id: 'risk', label: 'Quantitative Risk', icon: Activity, section: 'monitoring' },
  { id: 'network', label: 'Network Topology', icon: Network, section: 'monitoring' },
  { id: 'incidents', label: 'Incident Response', icon: Zap, section: 'monitoring' },
  
  // Governance & Records
  { id: 'audit', label: 'Tamper-Evident Ledger', icon: BookOpen, section: 'compliance' },
  { id: 'reports', label: 'Compliance Reports', icon: FileText, section: 'compliance' },
  { id: 'settings', label: 'System Configuration', icon: Settings, section: 'compliance' },
];

const SECTIONS = [
  { id: 'core', label: 'Core Zero-Trust' },
  { id: 'intelligence', label: 'Advanced Intelligence' },
  { id: 'monitoring', label: 'Continuous Monitoring' },
  { id: 'compliance', label: 'Compliance & Audit' },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="sidebar" style={{ width: 260, minWidth: 260 }}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo">SM</div>
        <div>
          <div className="brand-name">SecureMesh</div>
          <div className="brand-tagline">ZERO-TRUST ECOSYSTEM</div>
        </div>
      </div>

      {/* Nav List */}
      <div className="sidebar-nav" style={{ padding: '16px 14px' }}>
        {SECTIONS.map((sec) => {
          const items = NAV_ITEMS.filter((item) => item.section === sec.id);
          if (items.length === 0) return null;
          return (
            <div key={sec.id} style={{ marginBottom: 16 }}>
              <div className="nav-section-label" style={{ paddingLeft: 10, marginBottom: 4 }}>
                {sec.label}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id)}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        width: '100%',
                        padding: '9px 12px',
                        textAlign: 'left'
                      }}
                    >
                      <Icon size={16} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }} />
                      <span style={{ fontSize: '0.84rem', fontWeight: isActive ? 600 : 500, letterSpacing: '-0.01em' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Footer Profile */}
      <div className="sidebar-footer" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#ffffff',
              boxShadow: '0 0 12px rgba(6, 182, 212, 0.35)'
            }}>
              {user?.username?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', lineHeight: 1.2 }}>
                {user?.username || 'admin'}
              </div>
              <div style={{ fontSize: '0.66rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan-400)', fontWeight: 600, letterSpacing: '0.04em' }}>
                {user?.role?.toUpperCase() || 'ADMIN'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-muted)',
              width: 30,
              height: 30,
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 150ms ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--red-400)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </nav>
  );
}
