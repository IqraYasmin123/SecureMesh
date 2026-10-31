import React, { useState } from 'react';
import { scoreRisk } from '../api/client';
import { RiskScore, DecisionBadge } from '../components/Badges';
import { Activity, Info, AlertTriangle } from 'lucide-react';

const DEFAULT_INPUTS = { identity_risk: 0.3, anomaly_score: 0.4, asset_criticality: 0.5, policy_violation: 0.1 };
const DEFAULT_WEIGHTS = { identity_risk: 0.25, anomaly_score: 0.35, asset_criticality: 0.25, policy_violation: 0.15 };

function Slider({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--cyan-400)' }}>{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0} max={1} step={0.01}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--cyan-500)' }}
      />
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{hint}</div>
    </div>
  );
}

export default function RiskPage() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWeights, setShowWeights] = useState(false);

  const weightsSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const weightsValid = Math.abs(weightsSum - 1.0) < 0.001;

  const handleScore = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await scoreRisk({ ...inputs, weights: weightsValid ? weights : undefined });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (preset: string) => {
    const presets: Record<string, typeof DEFAULT_INPUTS> = {
      low: { identity_risk: 0.1, anomaly_score: 0.1, asset_criticality: 0.2, policy_violation: 0.0 },
      medium: { identity_risk: 0.4, anomaly_score: 0.5, asset_criticality: 0.5, policy_violation: 0.2 },
      high: { identity_risk: 0.7, anomaly_score: 0.8, asset_criticality: 0.8, policy_violation: 0.5 },
      critical: { identity_risk: 0.95, anomaly_score: 0.9, asset_criticality: 0.95, policy_violation: 0.8 },
    };
    if (presets[preset]) setInputs(presets[preset]);
  };

  return (
    <div className="page animate-in">
      <h1 className="page-title">Mathematical Risk Analysis</h1>
      <p className="page-subtitle">
        Explainable weighted risk scoring: R = 100(w<sub>I</sub>·I + w<sub>A</sub>·A + w<sub>C</sub>·C + w<sub>P</sub>·P)
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Input Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Formula */}
          <div className="glass-sm" style={{ padding: 16 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Risk Formula
            </div>
            <div className="code-block" style={{ fontSize: '0.85rem' }}>
              R = 100 × (0.25·I + 0.35·A + 0.25·C + 0.15·P)
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
              I = Identity Risk · A = Anomaly Score · C = Asset Criticality · P = Policy Violation
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Quick Presets</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['low', 'medium', 'high', 'critical'].map(p => (
                <button key={p} className="btn btn-ghost btn-sm" onClick={() => setPreset(p)} style={{ textTransform: 'capitalize' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Inputs */}
          <div className="glass" style={{ padding: 20 }}>
            <div className="section-title" style={{ marginBottom: 16 }}><Activity size={16} color="var(--cyan-400)" />Risk Factor Inputs</div>

            <Slider label="Identity Risk (I)" value={inputs.identity_risk} onChange={v => setInputs(p => ({ ...p, identity_risk: v }))} hint="Session risk, failed logins, suspicious location" />
            <Slider label="Anomaly Score (A)" value={inputs.anomaly_score} onChange={v => setInputs(p => ({ ...p, anomaly_score: v }))} hint="Deviation from baseline behavioral patterns" />
            <Slider label="Asset Criticality (C)" value={inputs.asset_criticality} onChange={v => setInputs(p => ({ ...p, asset_criticality: v }))} hint="Sensitivity of the target asset or resource" />
            <Slider label="Policy Violation (P)" value={inputs.policy_violation} onChange={v => setInputs(p => ({ ...p, policy_violation: v }))} hint="Severity of zero-trust policy violation" />

            <button className="btn btn-ghost btn-sm" onClick={() => setShowWeights(!showWeights)} style={{ marginBottom: showWeights ? 12 : 0 }}>
              <Info size={13} />
              {showWeights ? 'Hide' : 'Customize'} Weights
            </button>

            {showWeights && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(13,31,58,0.8)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,211,238,0.08)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                  Weights must sum to 1.0 (currently: <strong style={{ color: weightsValid ? 'var(--green-400)' : 'var(--red-400)' }}>{weightsSum.toFixed(2)}</strong>)
                </div>
                {Object.entries(weights).map(([key, val]) => (
                  <Slider
                    key={key}
                    label={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    value={val}
                    onChange={v => setWeights(p => ({ ...p, [key]: v }))}
                    hint=""
                  />
                ))}
              </div>
            )}
          </div>

          {error && <div className="error-banner"><AlertTriangle size={16} />{error}</div>}

          <button
            className="btn btn-primary"
            onClick={handleScore}
            disabled={loading || (showWeights && !weightsValid)}
            style={{ justifyContent: 'center' }}
          >
            {loading ? 'Calculating...' : 'Calculate Risk Score'}
          </button>
        </div>

        {/* Results Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result ? (
            <>
              {/* Main Score */}
              <div className="glass" style={{ padding: 24 }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Risk Score</div>
                  <RiskScore score={result.score} category={result.category} size="lg" showBar />
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 }}>
                  <DecisionBadge decision={result.decision} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{result.explanation}</span>
                </div>
                <div style={{ marginTop: 12, padding: 10, background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.15)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--green-400)' }}>
                    <strong>Recommendation:</strong> {result.recommended_action}
                  </div>
                </div>
              </div>

              {/* Factor Breakdown */}
              <div className="glass" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 16 }}>Factor Contributions</div>
                {result.factors?.map((f: any) => (
                  <div key={f.key} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{f.name}</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>w={f.weight}</span>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', fontWeight: 700, color: f.contribution > 20 ? 'var(--red-400)' : f.contribution > 10 ? 'var(--amber-400)' : 'var(--green-400)' }}>
                          +{f.contribution.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    <div className="risk-bar-track">
                      <div
                        className="risk-bar-fill"
                        style={{
                          width: `${(f.contribution / result.score) * 100}%`,
                          background: `linear-gradient(90deg, var(--cyan-500), var(--blue-500))`,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>{f.description}</div>
                  </div>
                ))}
              </div>

              {/* Calculation details */}
              <div className="glass-sm" style={{ padding: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Calculation Trace</div>
                <div className="code-block">
{`R = 100 × (
  ${result.weights?.identity_risk} × ${inputs.identity_risk.toFixed(2)}  [Identity Risk]
+ ${result.weights?.anomaly_score} × ${inputs.anomaly_score.toFixed(2)}  [Anomaly Score]
+ ${result.weights?.asset_criticality} × ${inputs.asset_criticality.toFixed(2)}  [Asset Criticality]
+ ${result.weights?.policy_violation} × ${inputs.policy_violation.toFixed(2)}  [Policy Violation]
)
= ${result.score.toFixed(2)} (${result.category.toUpperCase()})`}
                </div>
              </div>
            </>
          ) : (
            <div className="glass" style={{ padding: 32, textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div>
                <Activity size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Set risk factors and calculate</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 6 }}>Results will appear here with full factor breakdown</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
