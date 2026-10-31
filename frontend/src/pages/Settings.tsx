import React, { useEffect, useState } from 'react';
import { getSettings, updateSettings, resetDemoData } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Shield, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const [settings, setSettings] = useState<any>({
    risk_threshold_low: 30.0,
    risk_threshold_medium: 60.0,
    risk_threshold_high: 80.0,
    auto_quarantine_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setError('');
    try {
      const res = await getSettings();
      setSettings(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load settings');
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('admin')) {
      setError('Only administrators can update zero-trust system settings.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await updateSettings(settings);
      setSettings(res.data.settings);
      setSuccess('Settings updated successfully.');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    if (!hasPermission('admin')) {
      setError('Only administrators can reset demo data.');
      return;
    }
    if (!window.confirm('Reset all demo events, alerts, and assets back to default baseline?')) return;
    setResetting(true);
    setError('');
    setSuccess('');
    try {
      await resetDemoData();
      setSuccess('Demo environment successfully re-seeded to initial clean baseline.');
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to reset demo data');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="page animate-in">
      <h1 className="page-title">System Settings & Governance</h1>
      <p className="page-subtitle">Zero-Trust policy threshold tuning, automated quarantine rules, and environment administration</p>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{error}</div>}
      {success && <div className="success-banner" style={{ marginBottom: 16 }}><CheckCircle size={16} />{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Threshold Settings Form */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="section-title" style={{ marginBottom: 20 }}>
            <Shield size={18} color="var(--cyan-400)" />
            Zero-Trust Risk Scoring Thresholds
          </div>

          <form onSubmit={handleSave}>
            <div className="input-group">
              <label className="input-label">Low Risk Threshold (Max for ALLOW)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={99}
                value={settings.risk_threshold_low}
                onChange={e => setSettings({ ...settings, risk_threshold_low: parseFloat(e.target.value) })}
                disabled={!hasPermission('admin')}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Events below this score are granted immediate access.</span>
            </div>

            <div className="input-group">
              <label className="input-label">Medium Risk Threshold (Max for STEP-UP)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={99}
                value={settings.risk_threshold_medium}
                onChange={e => setSettings({ ...settings, risk_threshold_medium: parseFloat(e.target.value) })}
                disabled={!hasPermission('admin')}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Events between Low and Medium trigger Step-Up MFA authentication.</span>
            </div>

            <div className="input-group">
              <label className="input-label">High Risk Threshold (Trigger Auto-DENY & Alert)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={99}
                value={settings.risk_threshold_high}
                onChange={e => setSettings({ ...settings, risk_threshold_high: parseFloat(e.target.value) })}
                disabled={!hasPermission('admin')}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Events exceeding this score are unconditionally blocked.</span>
            </div>

            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="autoQuarantine"
                checked={settings.auto_quarantine_enabled}
                onChange={e => setSettings({ ...settings, auto_quarantine_enabled: e.target.checked })}
                disabled={!hasPermission('admin')}
                style={{ width: 18, height: 18, accentColor: 'var(--cyan-500)' }}
              />
              <label htmlFor="autoQuarantine" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                Enable Automated Network Micro-Segmentation Quarantine
              </label>
            </div>

            {hasPermission('admin') && (
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Updating...' : 'Save Configuration'}
              </button>
            )}
          </form>
        </div>

        {/* Environment Operations & Reset */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>
              <RotateCcw size={18} color="var(--red-400)" />
              Environment Reset & Re-initialization
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 16 }}>
              Purges temporary event logs, dynamic alerts, and re-initializes the zero-trust mesh to the verified security baseline.
            </p>
            {hasPermission('admin') ? (
              <button className="btn btn-secondary" onClick={handleResetDemo} disabled={resetting} style={{ color: 'var(--red-400)' }}>
                <RotateCcw size={14} />
                {resetting ? 'Re-initializing...' : 'Re-initialize Mesh Baseline'}
              </button>
            ) : (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Administrator role required to re-initialize mesh baseline.
              </p>
            )}
          </div>

          <div className="glass-sm" style={{ padding: 18 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--cyan-400)', marginBottom: 8 }}>
              Runtime Architecture
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <div><strong>Core Engine:</strong> FastAPI + Python Cryptography</div>
              <div><strong>Audit Ledger:</strong> Tamper-evident SHA-256 Hash Chain</div>
              <div><strong>Encryption:</strong> AES-256-GCM Authenticated Cipher</div>
              <div><strong>Storage:</strong> SQLite with WAL Mode & Concurrency Safeguards</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
