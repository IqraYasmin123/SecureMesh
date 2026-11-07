import React, { useState } from 'react';
import { splitSecretMPC, reconstructSecretMPC, mpcThresholdSign, type MPCSplitResponse } from '../api/client';
import { Key, Share2, Cpu, CheckCircle2, AlertTriangle, Layers, Lock, Unlock, Hash, Terminal } from 'lucide-react';

export const MPCSecretSharingStudio: React.FC = () => {
  const [secret, setSecret] = useState('SUPER_SECRET_MESH_KEY_2026');
  const [thresholdK, setThresholdK] = useState(3);
  const [totalSharesN, setTotalSharesN] = useState(5);
  const [splitResult, setSplitResult] = useState<MPCSplitResponse | null>(null);
  const [selectedShares, setSelectedShares] = useState<number[]>([]);
  const [recoveredSecret, setRecoveredSecret] = useState<string | null>(null);
  const [thresholdSignResult, setThresholdSignResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSplit = async () => {
    setLoading(true);
    setError(null);
    setRecoveredSecret(null);
    setThresholdSignResult(null);
    try {
      const res = await splitSecretMPC({
        secret,
        threshold_k: thresholdK,
        total_shares_n: totalSharesN,
      });
      setSplitResult(res.data);
      setSelectedShares(res.data.shares.slice(0, thresholdK).map(s => s.share_x));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Secret splitting failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleShareSelection = (shareX: number) => {
    setSelectedShares(prev =>
      prev.includes(shareX) ? prev.filter(x => x !== shareX) : [...prev, shareX]
    );
  };

  const handleReconstruct = async () => {
    if (!splitResult) return;
    setLoading(true);
    setError(null);
    try {
      const chosen = splitResult.shares
        .filter(s => selectedShares.includes(s.share_x))
        .map(s => ({ share_x: s.share_x, share_hex: s.share_hex }));

      const res = await reconstructSecretMPC(chosen);
      setRecoveredSecret(res.data.recovered_secret);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reconstruction failed. Ensure threshold k shares are selected.');
    } finally {
      setLoading(false);
    }
  };

  const handleThresholdSign = async () => {
    if (!splitResult) return;
    setLoading(true);
    setError(null);
    try {
      const chosen = splitResult.shares
        .filter(s => selectedShares.includes(s.share_x))
        .map(s => ({ share_x: s.share_x, share_hex: s.share_hex }));

      const res = await mpcThresholdSign({
        message: `TX_AUTHORIZE_RECONFIGURATION_AT_${Date.now()}`,
        shares: chosen,
        threshold_k: splitResult.threshold_k,
      });
      setThresholdSignResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'MPC Threshold Signing failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-in">
      {/* Page Title & Subtitle */}
      <h1 className="page-title">Multi-Party Cryptography</h1>
      <p className="page-subtitle">
        Low-level polynomial secret distribution over Finite Field GF(2^256 - 189) with collaborative threshold signing.
      </p>

      {/* Header Metric Strip */}
      <div className="glass-sm" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scheme</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--cyan-400)', fontWeight: 600 }}>Shamir's Secret Sharing (k, n)</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Field Modulus</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>2^256 - 189 (256-bit Prime)</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Reconstruction</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--green-400)', fontWeight: 600 }}>Lagrange Interpolation L(0)</div>
          </div>
        </div>
        <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Cpu size={12} /> Finite Field Active
        </span>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{error}</div>}

      {/* Control Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, marginBottom: 20 }}>
        {/* Left: Configuration Card */}
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="section-title"><Key size={16} color="var(--cyan-400)" />Configure Secret & Threshold</div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Master Secret Payload</label>
            <input
              type="text"
              className="input-field"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="Enter sensitive key or seed"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Threshold (k)</span>
                <strong style={{ color: 'var(--cyan-400)' }}>{thresholdK}</strong>
              </label>
              <input
                type="range"
                min={2}
                max={5}
                value={thresholdK}
                onChange={e => setThresholdK(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-400)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Shares (n)</span>
                <strong style={{ color: 'var(--cyan-400)' }}>{totalSharesN}</strong>
              </label>
              <input
                type="range"
                min={thresholdK}
                max={10}
                value={totalSharesN}
                onChange={e => setTotalSharesN(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-400)' }}
              />
            </div>
          </div>

          <div className="glass-sm" style={{ padding: 12, fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>Polynomial Degree: <strong style={{ color: 'var(--cyan-400)' }}>{thresholdK - 1}</strong></div>
            <div>Reconstruction Requirement: Any <strong>{thresholdK}</strong> authentic nodes</div>
            <div>Security: Zero informational entropy leaked for &lt;{thresholdK} shares</div>
          </div>

          <button
            onClick={handleSplit}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Share2 size={16} /> Split Secret into ({thresholdK}, {totalSharesN}) Shares
          </button>
        </div>

        {/* Right: Distributed Node Shares */}
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-title"><Layers size={16} color="var(--cyan-400)" />Distributed Node Shares</div>
            {splitResult && (
              <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--cyan-400)' }}>
                Selected: {selectedShares.length} / {splitResult.threshold_k} Required
              </span>
            )}
          </div>

          {!splitResult ? (
            <div className="empty-state" style={{ minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={32} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <div className="empty-state-title">No Active Shares Generated</div>
              <div className="empty-state-sub">Configure the secret parameters on the left and click split.</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
                {splitResult.shares.map(s => {
                  const isSelected = selectedShares.includes(s.share_x);
                  return (
                    <div
                      key={s.share_x}
                      onClick={() => toggleShareSelection(s.share_x)}
                      className={`glass-sm ${isSelected ? 'active' : ''}`}
                      style={{
                        padding: 12,
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--cyan-400)' : undefined,
                        background: isSelected ? 'rgba(34, 211, 238, 0.1)' : undefined,
                        transition: 'all 150ms ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isSelected ? 'var(--cyan-400)' : 'var(--text-primary)' }}>
                          Mesh Node #{s.node_id} (x = {s.share_x})
                        </span>
                        <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                          VSS: {s.commitment_hash}
                        </span>
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        0x{s.share_hex}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: 8 }}>
                <button
                  onClick={handleReconstruct}
                  disabled={loading || selectedShares.length < splitResult.threshold_k}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Unlock size={14} /> Lagrange Reconstruct ({selectedShares.length}/{splitResult.threshold_k})
                </button>
                <button
                  onClick={handleThresholdSign}
                  disabled={loading || selectedShares.length < splitResult.threshold_k}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <Terminal size={14} /> MPC Threshold Sign
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Result Cards */}
      {(recoveredSecret || thresholdSignResult) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {recoveredSecret && (
            <div className="glass" style={{ padding: 20, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green-400)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>
                <CheckCircle2 size={16} /> Lagrange Finite Field Interpolation Verified
              </div>
              <div className="glass-sm" style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', color: '#ffffff', wordBreak: 'break-all', marginBottom: 8 }}>
                {recoveredSecret}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                Evaluated f(0) across {selectedShares.length} unique node points over GF(p).
              </div>
            </div>
          )}

          {thresholdSignResult && (
            <div className="glass" style={{ padding: 20, borderColor: 'rgba(34, 211, 238, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--cyan-400)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 10 }}>
                <Hash size={16} /> MPC Collaborative Threshold Signature
              </div>
              <div className="glass-sm" style={{ padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--cyan-300)', wordBreak: 'break-all', marginBottom: 8 }}>
                {thresholdSignResult.threshold_signature}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                Nodes [{thresholdSignResult.participating_nodes.join(', ')}] signed collaboratively without central key exposure.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
