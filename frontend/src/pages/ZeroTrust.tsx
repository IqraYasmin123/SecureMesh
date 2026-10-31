import React, { useState } from 'react';
import { evaluateZeroTrust } from '../api/client';
import { DecisionBadge, RiskScore } from '../components/Badges';
import { GitBranch, AlertTriangle, ShieldOff, ShieldCheck } from 'lucide-react';

const ACTIONS = [
  { value: 'view_dashboard', label: 'View Dashboard', category: 'read' },
  { value: 'view_audit', label: 'View Audit Log', category: 'read' },
  { value: 'export_data', label: 'Export Report', category: 'write' },
  { value: 'decrypt_file', label: 'Decrypt File', category: 'sensitive' },
  { value: 'modify_settings', label: 'Modify Settings', category: 'sensitive' },
  { value: 'manage_users', label: 'Manage Users', category: 'admin' },
  { value: 'reset_demo', label: 'Reset Demo Data', category: 'admin' },
  { value: 'delete_asset', label: 'Delete Asset', category: 'admin' },
];

export default function ZeroTrustPage() {
  const [action, setAction] = useState('view_audit');
  const [assetCriticality, setAssetCriticality] = useState(0.5);
  const [identityRisk, setIdentityRisk] = useState(0.2);
  const [anomalyScore, setAnomalyScore] = useState(0.3);
  const [policyViolation, setPolicyViolation] = useState(0.1);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  const handleEvaluate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await evaluateZeroTrust({
        action,
        asset_criticality: assetCriticality,
        identity_risk: identityRisk,
        anomaly_score: anomalyScore,
        policy_violation: policyViolation,
      });
      setResult(res.data);
      setHistory(prev => [{ ...res.data, action, timestamp: new Date().toISOString() }, ...prev].slice(0, 8));
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Evaluation failed');
    } finally { setLoading(false); }
  };

  const decisionColor = result?.decision === 'ALLOW' ? 'var(--green-400)' : result?.decision === 'STEP_UP' ? 'var(--amber-400)' : 'var(--red-400)';
  const DecisionIcon = result?.decision === 'ALLOW' ? ShieldCheck : result?.decision === 'STEP_UP' ? AlertTriangle : ShieldOff;

  return (
    <div className="page animate-in">
      <h1 className="page-title">Zero-Trust Decision Engine</h1>
      <p className="page-subtitle">Evaluate every protected action against current risk signals — trust nothing by default</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginBottom: 20 }}><GitBranch size={16} color="var(--cyan-400)" />Evaluation Parameters</div>

            <div className="input-group">
              <label className="input-label">Protected Action</label>
              <select className="input" value={action} onChange={e => setAction(e.target.value)}>
                {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label} ({a.category})</option>)}
              </select>
            </div>

            {[
              { label: 'Identity / Session Risk', value: identityRisk, set: setIdentityRisk, hint: 'Failed logins, suspicious session, unknown device' },
              { label: 'Behavioral Anomaly Score', value: anomalyScore, set: setAnomalyScore, hint: 'Deviation from baseline access patterns' },
              { label: 'Asset Criticality', value: assetCriticality, set: setAssetCriticality, hint: 'Sensitivity of the resource being accessed' },
              { label: 'Policy Violation Severity', value: policyViolation, set: setPolicyViolation, hint: 'Degree to which zero-trust policies are violated' },
            ].map(({ label, value, set, hint }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--cyan-400)' }}>{value.toFixed(2)}</span>
                </div>
                <input type="range" min={0} max={1} step={0.01} value={value} onChange={e => set(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--cyan-500)' }} />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>
              </div>
            ))}

            {error && <div className="error-banner" style={{ marginBottom: 12 }}><AlertTriangle size={16} />{error}</div>}

            <button className="btn btn-primary" onClick={handleEvaluate} disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Evaluating...' : 'Evaluate Zero-Trust Decision'}
            </button>
          </div>

          {/* Policy info */}
          <div className="glass-sm" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase' }}>Policy Thresholds</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { range: '0–40', decision: 'ALLOW', color: 'var(--green-400)' },
                { range: '40–70', decision: 'STEP-UP', color: 'var(--amber-400)' },
                { range: '70–100', decision: 'DENY', color: 'var(--red-400)' },
              ].map(p => (
                <div key={p.decision} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{p.range}</span>
                  <span style={{ color: p.color, fontWeight: 700 }}>{p.decision}</span>
                </div>
              ))}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Sensitive actions lower the allow/step-up thresholds by 25%.
              </div>
            </div>
          </div>
        </div>

        {/* Result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <>
              {/* Decision Banner */}
              <div style={{
                padding: 28,
                borderRadius: 'var(--radius-lg)',
                border: `2px solid ${decisionColor}40`,
                background: `linear-gradient(135deg, ${decisionColor}10, transparent)`,
                textAlign: 'center',
              }}>
                <DecisionIcon size={40} color={decisionColor} style={{ marginBottom: 12 }} />
                <div style={{ fontSize: '2rem', fontWeight: 800, color: decisionColor, letterSpacing: '0.05em', marginBottom: 8 }}>
                  {result.decision === 'STEP_UP' ? 'STEP-UP' : result.decision}
                </div>
                <RiskScore score={result.risk_score} category={result.risk_category} showBar />
              </div>

              {/* Explanation */}
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 12 }}>Decision Explanation</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
                  {result.explanation}
                </div>
                {result.role_restriction && (
                  <div style={{ padding: 10, background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '0.8rem', color: 'var(--red-400)' }}>
                    {result.role_restriction}
                  </div>
                )}
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.15)', fontSize: '0.8rem', color: 'var(--green-400)' }}>
                  <strong>Recommendation:</strong> {result.recommended_action}
                </div>
              </div>

              {/* Factor breakdown */}
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 12 }}>Risk Factor Contributions</div>
                {result.factors?.map((f: any) => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{f.name}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: 'var(--cyan-400)' }}>+{f.contribution.toFixed(1)}</span>
                    </div>
                    <div className="risk-bar-track">
                      <div className="risk-bar-fill" style={{ width: `${(f.contribution / Math.max(result.risk_score, 1)) * 100}%`, background: 'var(--cyan-500)', opacity: 0.8 }} />
                    </div>
                  </div>
                ))}
              </div>

              {result.is_sensitive_action && (
                <div className="glass-sm" style={{ padding: 12 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--amber-400)' }}>
                    ⚠ Sensitive action detected. Thresholds lowered by 25% — higher scrutiny applied.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass" style={{ padding: 48, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
              <div>
                <GitBranch size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Zero-Trust Evaluation</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>Set parameters and evaluate to see ALLOW / STEP-UP / DENY decision</div>
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="glass-sm" style={{ padding: 16 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Recent Evaluations</div>
              {history.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < history.length - 1 ? '1px solid rgba(34,211,238,0.05)' : 'none' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{h.action}</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{h.risk_score?.toFixed(0)}</span>
                    <DecisionBadge decision={h.decision} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
