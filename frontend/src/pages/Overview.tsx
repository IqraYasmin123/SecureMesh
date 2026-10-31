import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Server, RefreshCw, Zap, CheckCircle } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getSummary, generateDemoEvents } from '../api/client';
import { SeverityBadge } from '../components/Badges';
import NetworkVisualization from '../components/NetworkVisualization';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#10b981',
};

const DECISION_COLORS = {
  ALLOW: '#10b981',
  STEP_UP: '#f59e0b',
  DENY: '#ef4444',
};

export default function OverviewPage() {
  const { hasPermission } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getSummary();
      setSummary(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerateDemo = async () => {
    setGenerating(true);
    setGenMsg('');
    try {
      await generateDemoEvents();
      setGenMsg('Live security telemetry events simulated successfully');
      await load();
    } catch (e: any) {
      setGenMsg(e.response?.data?.detail || 'Simulation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  const severityData = summary ? Object.entries(summary.severity_distribution || {}).map(([name, value]) => ({
    name: name.toUpperCase(),
    value: value as number,
    fill: PIE_COLORS[name as keyof typeof PIE_COLORS] || '#64748b',
  })) : [];

  const decisionData = summary ? Object.entries(summary.decision_counts || {}).map(([name, value]) => ({
    name,
    value: value as number,
    fill: DECISION_COLORS[name as keyof typeof DECISION_COLORS] || '#64748b',
  })) : [];

  return (
    <div className="page animate-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Security Command Center</h1>
          <p className="page-subtitle">Real-time zero-trust security operations dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <RefreshCw size={14} />
            Refresh
          </button>
          {hasPermission('write') && (
            <button className="btn btn-secondary btn-sm" onClick={handleGenerateDemo} disabled={generating}>
              <Zap size={14} />
              {generating ? 'Simulating...' : 'Simulate Security Events'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{error}</div>}
      {genMsg && <div className="success-banner" style={{ marginBottom: 16 }}><CheckCircle size={16} />{genMsg}</div>}

      {/* Metric Cards */}
      <div className="metric-grid">
        <div className="metric-card cyan">
          <div className="metric-label"><Activity size={14} />Total Events</div>
          <div className="metric-value cyan">{summary?.total_events ?? 0}</div>
          <div className="metric-sub">Security events recorded</div>
        </div>
        <div className="metric-card red">
          <div className="metric-label"><AlertTriangle size={14} />Open Alerts</div>
          <div className="metric-value red">{summary?.open_alerts ?? 0}</div>
          <div className="metric-sub">Require investigation</div>
        </div>
        <div className="metric-card amber">
          <div className="metric-label"><Zap size={14} />High-Risk Events</div>
          <div className="metric-value amber">{summary?.high_risk_events ?? 0}</div>
          <div className="metric-sub">High or critical severity</div>
        </div>
        <div className="metric-card green">
          <div className="metric-label"><Server size={14} />Protected Assets</div>
          <div className="metric-value green">{summary?.protected_assets ?? 0}</div>
          <div className="metric-sub">Active monitored assets</div>
        </div>
      </div>

      {/* 3D Visualization + Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Network Visualization */}
        <div className="glass" style={{ padding: 0, overflow: 'hidden', minHeight: 320 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="status-dot online" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Live Network Topology
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              Zero-Trust Monitoring Active
            </span>
          </div>
          <div style={{ height: 300 }}>
            <NetworkVisualization />
          </div>
        </div>

        {/* Risk Trend */}
        <div className="chart-container">
          <div className="section-header">
            <span className="section-title"><Activity size={16} color="var(--cyan-400)" />Risk Trend (7 days)</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={summary?.risk_trend || []}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.05)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ background: 'var(--navy-850)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Area type="monotone" dataKey="avg_risk" stroke="#06b6d4" strokeWidth={2} fill="url(#riskGrad)" name="Avg Risk" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Severity Distribution */}
        <div className="chart-container">
          <div className="section-title" style={{ marginBottom: 12 }}>Severity Distribution</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {severityData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} opacity={0.85} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--navy-850)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }}
              />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Zero-Trust Decisions */}
        <div className="chart-container">
          <div className="section-title" style={{ marginBottom: 12 }}>Policy Decisions</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={decisionData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.05)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--navy-850)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {decisionData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Event Volume */}
        <div className="chart-container">
          <div className="section-title" style={{ marginBottom: 12 }}>Event Volume (7 days)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={summary?.risk_trend || []} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.05)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--navy-850)', border: '1px solid var(--glass-border)', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="event_count" fill="#3b82f6" radius={[3, 3, 0, 0]} name="Events" opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Events + Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent Events */}
        <div className="glass" style={{ padding: 20 }}>
          <div className="section-header">
            <span className="section-title"><Activity size={16} color="var(--cyan-400)" />Recent Events</span>
          </div>
          {summary?.recent_events?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No events yet</div>
              <div className="empty-state-text">Generate demo events to populate the dashboard</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(summary?.recent_events || []).slice(0, 6).map((ev: any) => (
                <div key={ev.id} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'rgba(13, 31, 58, 0.5)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(34, 211, 238, 0.05)',
                }}>
                  <div>
                    <SeverityBadge severity={ev.severity} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.description}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {ev.username || 'system'} · {new Date(ev.timestamp).toLocaleString()}
                    </div>
                  </div>
                  {ev.risk_score != null && (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: 700, color: ev.risk_score > 60 ? 'var(--red-400)' : ev.risk_score > 40 ? 'var(--amber-400)' : 'var(--green-400)' }}>
                      {ev.risk_score.toFixed(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="glass" style={{ padding: 20 }}>
          <div className="section-header">
            <span className="section-title"><AlertTriangle size={16} color="var(--red-400)" />Active Alerts</span>
          </div>
          {summary?.recent_alerts?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No active alerts</div>
              <div className="empty-state-text">System is operating normally</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(summary?.recent_alerts || []).map((al: any) => (
                <div key={al.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: 'rgba(239, 68, 68, 0.04)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                }}>
                  <AlertTriangle size={14} color={al.severity === 'critical' ? 'var(--red-500)' : al.severity === 'high' ? 'var(--amber-500)' : 'var(--blue-500)'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {al.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {new Date(al.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <SeverityBadge severity={al.severity} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
