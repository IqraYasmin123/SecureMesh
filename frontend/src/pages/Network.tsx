import React, { useEffect, useState } from 'react';
import { getAssets, getAssetEdges } from '../api/client';
import NetworkVisualization from '../components/NetworkVisualization';
import { RiskScore } from '../components/Badges';
import { Server, Shield, Database, Globe, RefreshCw, Cpu, HardDrive } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  server: Server,
  database: Database,
  endpoint: Cpu,
  firewall: Shield,
  gateway: Globe,
  cloud_service: HardDrive,
};

export default function NetworkPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [assetsRes, edgesRes] = await Promise.all([getAssets(), getAssetEdges()]);
      setAssets(assetsRes.data);
      setEdges(edgesRes.data);
      if (assetsRes.data.length > 0) {
        setSelectedAsset(assetsRes.data[0]);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load network topology');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="page animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Network Mesh Topology</h1>
          <p className="page-subtitle">Zero-trust asset graph, trust relationships, and micro-segmentation policies</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Top 3D / Live Canvas View */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden', minHeight: 340, marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="status-dot online" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Interactive Zero-Trust Mesh Simulator
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {assets.length} Monitored Assets · {edges.length} Active Cryptographic Channels
          </span>
        </div>
        <div style={{ height: 320 }}>
          <NetworkVisualization />
        </div>
      </div>

      {/* Assets & Detail Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedAsset ? '1.5fr 1fr' : '1fr', gap: 20 }}>
        {/* Assets list */}
        <div className="table-container">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', fontWeight: 600, color: 'var(--text-primary)' }}>
            Asset Inventory
          </div>
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Type</th>
                  <th>IP Address</th>
                  <th>Criticality</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => {
                  const Icon = TYPE_ICONS[a.asset_type] || Server;
                  const isSelected = selectedAsset?.id === a.id;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => setSelectedAsset(a)}
                      style={{ cursor: 'pointer', background: isSelected ? 'rgba(34,211,238,0.08)' : undefined }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Icon size={16} color="var(--cyan-400)" />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                        {a.asset_type.replace('_', ' ')}
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {a.ip_address || '—'}
                      </td>
                      <td>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '0.78rem',
                          color: a.criticality > 0.7 ? 'var(--red-400)' : a.criticality > 0.4 ? 'var(--amber-400)' : 'var(--green-400)',
                          fontWeight: 700,
                        }}>
                          {(a.criticality * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${a.status === 'active' ? 'low' : 'critical'}`}>
                          {a.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Asset Details */}
        {selectedAsset && (
          <div className="glass" style={{ padding: 20, height: 'fit-content' }}>
            <div className="section-title" style={{ marginBottom: 16 }}>
              <Server size={18} color="var(--cyan-400)" />
              Asset Profile: {selectedAsset.name}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Asset Identifier</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', color: 'var(--cyan-400)' }}>
                  {selectedAsset.id}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Criticality Score</div>
                <RiskScore score={selectedAsset.criticality * 100} showBar />
              </div>

              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Connected Trust Edges</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                  {edges.filter(e => e.source_id === selectedAsset.id || e.target_id === selectedAsset.id).map(e => (
                    <div key={e.id} style={{
                      padding: '8px 10px',
                      background: 'rgba(13, 31, 58, 0.6)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--glass-border)',
                      fontSize: '0.78rem',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {e.source_id === selectedAsset.id ? `→ ${e.target_id}` : `← ${e.source_id}`}
                        </span>
                        <span className={`badge badge-${e.protocol === 'mTLS' ? 'low' : 'medium'}`}>
                          {e.protocol}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Policy: {e.policy_status} · Weight: {e.weight}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
