import React, { useEffect, useState } from 'react';
import { getAuditRecords, verifyAuditChain } from '../api/client';
import { BookOpen, CheckCircle, AlertTriangle, RefreshCw, Shield } from 'lucide-react';

export default function AuditPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAuditRecords({ limit: 100 });
      setRecords(res.data.records);
      setTotal(res.data.total);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load audit records');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyAuditChain();
      setVerifyResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Verification failed');
    } finally { setVerifying(false); }
  };

  return (
    <div className="page animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Tamper-Evident Audit Trail</h1>
          <p className="page-subtitle">SHA-256 hash chain — each record is cryptographically linked to its predecessor</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
          <button className="btn btn-primary btn-sm" onClick={handleVerify} disabled={verifying}>
            <Shield size={14} />
            {verifying ? 'Verifying...' : 'Verify Chain'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{error}</div>}

      {/* Verification Result */}
      {verifyResult && (
        <div style={{
          padding: 20,
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${verifyResult.valid ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          background: verifyResult.valid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
          marginBottom: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {verifyResult.valid ? (
              <CheckCircle size={24} color="var(--green-400)" />
            ) : (
              <AlertTriangle size={24} color="var(--red-400)" />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: verifyResult.valid ? 'var(--green-400)' : 'var(--red-400)' }}>
                {verifyResult.valid ? 'Audit Chain Integrity Verified' : 'Audit Chain Integrity FAILED'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 3 }}>
                {verifyResult.message}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Records checked: {verifyResult.records_checked}
                {verifyResult.first_mismatch && (
                  <span style={{ color: 'var(--red-400)', marginLeft: 16 }}>First mismatch at record ID: {verifyResult.first_mismatch}</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <strong>Cryptographic Verification:</strong> SHA-256 block-level chaining guarantees that any retroactive record alteration or deletion invalidates the chain sequence immediately.
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div className="metric-card cyan" style={{ flex: 1 }}>
          <div className="metric-label"><BookOpen size={14} />Total Records</div>
          <div className="metric-value cyan">{total}</div>
        </div>
      </div>

      {/* Records table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No audit records</div>
            <div className="empty-state-text">Activity will be recorded here automatically</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Object</th>
                <th>Hash (truncated)</th>
              </tr>
            </thead>
            <tbody>
              {records.map(rec => (
                <tr key={rec.id}>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rec.id}</td>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(rec.timestamp).toLocaleString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--cyan-400)', fontSize: '0.85rem' }}>{rec.actor}</td>
                  <td>
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.78rem',
                      padding: '2px 8px',
                      background: 'rgba(59,130,246,0.1)',
                      borderRadius: 4,
                      color: 'var(--blue-400)',
                    }}>
                      {rec.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rec.object_id || '—'}</td>
                  <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {rec.current_hash.substring(0, 16)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
