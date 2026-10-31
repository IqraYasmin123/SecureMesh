import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, GitBranch, Activity, AlertTriangle,
  Network, Lock, FileText, BookOpen, Settings, LogOut, Zap
} from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, section: 'main' },
  { id: 'identity', label: 'Identity & Access', icon: Users, section: 'main' },
  { id: 'zerotrust', label: 'Zero-Trust Decisions', icon: GitBranch, section: 'security' },
  { id: 'risk', label: 'Risk Analysis', icon: Activity, section: 'security' },
  { id: 'threats', label: 'Threat Detection', icon: AlertTriangle, section: 'security' },
  { id: 'network', label: 'Network Graph', icon: Network, section: 'security' },
  { id: 'crypto', label: 'Cryptography Lab', icon: Lock, section: 'tools' },
  { id: 'incidents', label: 'Incidents', icon: Zap, section: 'tools' },
  { id: 'audit', label: 'Audit Trail', icon: BookOpen, section: 'tools' },
  { id: 'reports', label: 'Reports', icon: FileText, section: 'tools' },
  { id: 'settings', label: 'Settings', icon: Settings, section: 'system' },
];

const SECTIONS = [
  { id: 'main', label: 'Operations' },
  { id: 'security', label: 'Security' },
  { id: 'tools', label: 'Tools' },
  { id: 'system', label: 'System' },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">SM</div>
        <div>
          <div className="brand-name">SecureMesh</div>
          <div className="brand-tagline">ZERO-TRUST ECOSYSTEM</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="sidebar-nav">
        {SECTIONS.map(section => {
          const items = NAV_ITEMS.filter(i => i.section === section.id);
          return (
            <div key={section.id}>
              <div className="nav-section-label">{section.label}</div>
              {items.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => onNavigate(item.id)}
                    style={{ width: '100%', textAlign: 'left', background: 'none', cursor: 'pointer', border: isActive ? undefined : '1px solid transparent' }}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User / Footer */}
      <div className="sidebar-footer">
        {user && (
          <div style={{
            padding: '10px',
            background: 'rgba(13, 31, 58, 0.8)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 8,
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--cyan-600), var(--blue-700))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'white',
                flexShrink: 0,
              }}>
                {user.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.username}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {user.role}
                </div>
              </div>
            </div>
          </div>
        )}
        <button
          className="nav-item"
          onClick={handleLogout}
          style={{ width: '100%', textAlign: 'left', background: 'none', cursor: 'pointer', color: 'var(--red-400)' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
