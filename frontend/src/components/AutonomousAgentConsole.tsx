import React, { useState, useEffect } from 'react';
import { triggerAutonomousAgent, getAgentHistory, type AgentEvaluationResponse } from '../api/client';
import { Bot, Lock, FileCheck2, Activity, Play, RefreshCw, Cpu, CheckCircle } from 'lucide-react';

export const AutonomousAgentConsole: React.FC = () => {
  const [severity, setSeverity] = useState('HIGH');
  const [anomalyScore, setAnomalyScore] = useState(0.85);
  const [identityRisk, setIdentityRisk] = useState(0.70);
  const [assetId, setAssetId] = useState('DATABASE_PRIMARY_CORE');
  const [confidentialData, setConfidentialData] = useState('DATABASE_USER=admin;SECRET_AUTH_SEED=99281a8f7c');
  const [latestDecision, setLatestDecision] = useState<AgentEvaluationResponse | null>(null);
  const [history, setHistory] = useState<AgentEvaluationResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    try {
      const res = await getAgentHistory();
      setHistory(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleTriggerAgent = async () => {
    setLoading(true);
    try {
      const res = await triggerAutonomousAgent({
        severity,
        anomaly_score: anomalyScore,
        identity_risk: identityRisk,
        asset_id: assetId,
        data: confidentialData,
      });
      setLatestDecision(res.data);
      fetchHistory();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page animate-in">
      {/* Page Title & Subtitle */}
      <h1 className="page-title">Autonomous Security Agent</h1>
      <p className="page-subtitle">
        Autonomous AI agent that ingests network telemetry, evaluates real-time risk posture, and executes verifiable cryptographic encryption.
      </p>

      {/* Header Metric Strip */}
      <div className="glass-sm" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Agent Identity</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--cyan-400)', fontWeight: 600 }}>MESHGUARD-AGENT-01</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Execution Mode</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>Continuous Zero-Trust Loop</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Attestation Engine</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--green-400)', fontWeight: 600 }}>SHA-256 Verifiable Proofs</div>
          </div>
        </div>
        <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={12} /> Active Monitor
        </span>
      </div>

      {/* Interactive Agent Simulation Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, marginBottom: 20 }}>
        {/* Left: Telemetry Inputs */}
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="section-title"><Cpu size={16} color="var(--cyan-400)" />Ingest Telemetry Vector</div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Target Asset ID</label>
            <input
              type="text"
              className="input-field"
              value={assetId}
              onChange={e => setAssetId(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Threat Severity Level</label>
            <select
              className="select-field"
              value={severity}
              onChange={e => setSeverity(e.target.value)}
            >
              <option value="CRITICAL">CRITICAL (Trigger Emergency Lockdown)</option>
              <option value="HIGH">HIGH (Trigger Autonomous Encryption)</option>
              <option value="MEDIUM">MEDIUM (Challenge & Step-Up)</option>
              <option value="LOW">LOW (Passive Observation)</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Anomaly Score</span>
                <strong style={{ color: 'var(--cyan-400)' }}>{anomalyScore}</strong>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={anomalyScore}
                onChange={e => setAnomalyScore(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-400)' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Identity Risk</span>
                <strong style={{ color: 'var(--cyan-400)' }}>{identityRisk}</strong>
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={identityRisk}
                onChange={e => setIdentityRisk(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--cyan-400)' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confidential Asset Data to Seal</label>
            <textarea
              className="textarea-field"
              rows={2}
              value={confidentialData}
              onChange={e => setConfidentialData(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          <button
            onClick={handleTriggerAgent}
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading ? <RefreshCw size={16} className="spin" /> : <Play size={16} />}
            Trigger Autonomous Agent Evaluation
          </button>
        </div>

        {/* Right: Decision Output & Verifiable Proof */}
        <div className="glass" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="section-title"><Bot size={16} color="var(--cyan-400)" />Autonomous Decision & Cryptographic Proof</div>
            {latestDecision && (
              <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle size={12} /> Verifiable Proof Emitted
              </span>
            )}
          </div>

          {!latestDecision ? (
            <div className="empty-state" style={{ minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={36} color="var(--text-muted)" style={{ marginBottom: 12 }} />
              <div className="empty-state-title">Agent In Idle Monitoring State</div>
              <div className="empty-state-sub">Adjust telemetry vectors on the left and trigger evaluation to observe verifiable actions.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Decision Badge */}
              <div className="glass-sm" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Action Executed</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
                    {latestDecision.autonomous_decision.action}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {latestDecision.autonomous_decision.reason}
                  </div>
                </div>
                <div style={{ textAlign: 'right', borderLeft: '1px solid var(--glass-border)', paddingLeft: 16 }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trust Score</div>
                  <div style={{ fontSize: '1.6rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 800, color: 'var(--cyan-400)' }}>
                    {latestDecision.metrics.computed_trust_score}
                  </div>
                </div>
              </div>

              {/* Cryptographic Action Details */}
              {latestDecision.cryptographic_action.encryption && (
                <div className="glass-sm" style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--cyan-400)', marginBottom: 6 }}>
                    <Lock size={14} /> Autonomous AES-256-GCM Envelope
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
                    Ciphertext: {latestDecision.cryptographic_action.encryption.ciphertext.slice(0, 56)}...
                  </div>
                  {latestDecision.cryptographic_action.mpc_secret_sharing && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Key automatically distributed across {latestDecision.cryptographic_action.mpc_secret_sharing.total_shares_n} mesh nodes via Shamir's Secret Sharing.
                    </div>
                  )}
                </div>
              )}

              {/* Verifiable Attestation Proof */}
              <div className="glass-sm" style={{ padding: 14, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: 'var(--green-400)', marginBottom: 6 }}>
                  <FileCheck2 size={14} /> Cryptographic Proof Attestation
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--green-400)', wordBreak: 'break-all' }}>
                  SHA-256 Digest: {latestDecision.verifiable_attestation.proof_hash}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Binds: Agent ID ({latestDecision.agent_id}) + Input Digest + Action State Transition. Past evaluations in audit chain: {history.length}.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
