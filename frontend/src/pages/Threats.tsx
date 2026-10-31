import React, { useEffect, useState } from 'react';
import { getAlerts, updateAlert } from '../api/client';
import { SeverityBadge, StatusBadge, RiskScore } from '../components/Badges';
import { AlertTriangle, CheckCircle, X, RefreshCw, Filter } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ThreatsPage() {
  const { hasPermission } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [updating, setUpdating] = useState<number | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAlerts({ status: statusFilter || undefined, severity: severityFilter || undefined, limit: 100 });
      setAlerts(res.data.alerts);
      setTotal(res.data.total);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter, severityFilter]);

  const handleUpdate = async (alertId: number, status: string) => {
    if (!hasPermission('acknowledge_alerts')) return;
    setUpdating(alertId);
    try {
      await updateAlert(alertId, { status });
      await load();
      if (selected?.id === alertId) {
        setSelected((prev: any) => ({ ...prev, status }));
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="page animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Threat Detection</h1>
          <p className="page-subtitle">Continuous threat detection and alert response — real-time policy evaluation on security telemetry</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{error}</div>}

      {/* Stats */}
      <div className="metric-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Alerts', value: total, color: 'cyan' },
          { label: 'Open', value: alerts.filter(a => a.status === 'open').length, color: 'red' },
          { label: 'Acknowledged', value: alerts.filter(a => a.status === 'acknowledged').length, color: 'amber' },
          { label: 'Resolved', value: alerts.filter(a => a.status === 'resolved').length, color: 'green' },
        ].map(stat => (
          <div key={stat.label} className={`metric-card ${stat.color}`}>
            <div className="metric-label">{stat.label}</div>
            <div className={`metric-value ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <Filter size={14} color="var(--text-muted)" />
        <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>
        <select className="input" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>
        {/* Alert list */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : alerts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🛡️</div>
              <div className="empty-state-title">No Active Threats</div>
              <div className="empty-state-text">All monitored endpoints and services are operating normally</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Alert</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(alert => (
                  <tr
                    key={alert.id}
                    onClick={() => setSelected(alert === selected ? null : alert)}
                    style={{ cursor: 'pointer', background: selected?.id === alert.id ? 'rgba(34,211,238,0.05)' : undefined }}
                  >
                    <td><SeverityBadge severity={alert.severity} /></td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{alert.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>Event #{alert.event_id}</div>
                    </td>
                    <td>
                      {alert.risk_score != null ? (
                        <RiskScore score={alert.risk_score} size="sm" showBar={false} />
                      ) : '—'}
                    </td>
                    <td><StatusBadge status={alert.status} /></td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(alert.timestamp).toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {alert.status === 'open' && hasPermission('acknowledge_alerts') && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={e => { e.stopPropagation(); handleUpdate(alert.id, 'acknowledged'); }}
                            disabled={updating === alert.id}
                          >
                            <CheckCircle size={12} />Ack
                          </button>
                        )}
                        {alert.status !== 'resolved' && hasPermission('acknowledge_alerts') && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={e => { e.stopPropagation(); handleUpdate(alert.id, 'resolved'); }}
                            disabled={updating === alert.id}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="glass" style={{ padding: 20, height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="section-title"><AlertTriangle size={16} color="var(--red-400)" />Alert Detail</span>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{selected.title}</div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <SeverityBadge severity={selected.severity} />
                <StatusBadge status={selected.status} />
              </div>

              {selected.risk_score != null && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Risk Score</div>
                  <RiskScore score={selected.risk_score} showBar />
                </div>
              )}

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Detection Reason</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.detection_reason}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recommended Response</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--green-400)', lineHeight: 1.5 }}>{selected.recommended_response}</div>
              </div>

              {selected.acknowledged_by && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Acknowledged by: <strong style={{ color: 'var(--text-secondary)' }}>{selected.acknowledged_by}</strong>
                </div>
              )}
              {selected.resolved_by && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Resolved by: <strong style={{ color: 'var(--text-secondary)' }}>{selected.resolved_by}</strong>
                  {selected.resolved_at && <> at {new Date(selected.resolved_at).toLocaleString()}</>}
                </div>
              )}

              {selected.status !== 'resolved' && hasPermission('acknowledge_alerts') && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {selected.status === 'open' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => handleUpdate(selected.id, 'acknowledged')}>
                      <CheckCircle size={13} />Acknowledge
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => handleUpdate(selected.id, 'resolved')}>
                    Resolve
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleUpdate(selected.id, 'false_positive')}>
                    False Positive
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
