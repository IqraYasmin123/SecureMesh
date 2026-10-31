import React from 'react';

interface RiskScoreDisplayProps {
  score: number;
  category?: string;
  size?: 'sm' | 'md' | 'lg';
  showBar?: boolean;
  showLabel?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  minimal: 'var(--green-400)',
  low: 'var(--green-400)',
  medium: 'var(--amber-400)',
  high: 'var(--red-400)',
  critical: '#ef4444',
};

const FILL_CLASSES: Record<string, string> = {
  minimal: 'risk-fill-minimal',
  low: 'risk-fill-low',
  medium: 'risk-fill-medium',
  high: 'risk-fill-high',
  critical: 'risk-fill-critical',
};

function getCategory(score: number): string {
  if (score < 20) return 'minimal';
  if (score < 40) return 'low';
  if (score < 60) return 'medium';
  if (score < 80) return 'high';
  return 'critical';
}

export function RiskScore({ score, category, size = 'md', showBar = true, showLabel = true }: RiskScoreDisplayProps) {
  const cat = category || getCategory(score);
  const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.medium;
  const fillClass = FILL_CLASSES[cat] || FILL_CLASSES.medium;
  
  const fontSize = size === 'sm' ? '1rem' : size === 'lg' ? '2.5rem' : '1.5rem';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ 
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          fontSize,
          color,
          lineHeight: 1,
        }}>
          {score.toFixed(1)}
        </span>
        {showLabel && (
          <span style={{ 
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: '0.7rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background: color + '20',
            color,
            border: `1px solid ${color}40`,
          }}>
            {cat}
          </span>
        )}
      </div>
      {showBar && (
        <div className="risk-bar-track" style={{ width: size === 'sm' ? 80 : '100%' }}>
          <div
            className={`risk-bar-fill ${fillClass}`}
            style={{ width: `${Math.min(100, score)}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  return <span className={`badge badge-${severity?.toLowerCase()}`}>{severity?.toUpperCase()}</span>;
}

export function DecisionBadge({ decision }: { decision: string }) {
  const cls = decision?.toLowerCase().replace('_', '-');
  return (
    <span className={`badge badge-${cls}`}>
      {decision === 'STEP_UP' ? 'STEP-UP' : decision}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status?.toLowerCase().replace(' ', '_')}`}>{status?.toUpperCase()}</span>;
}

export function RoleBadge({ role }: { role: string }) {
  return <span className={`badge badge-${role?.toLowerCase()}`}>{role?.toUpperCase()}</span>;
}
