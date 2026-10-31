import React, { useState } from 'react';
import { exportData } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Download, ShieldCheck, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  const { hasPermission } = useAuth();
  const [reportType, setReportType] = useState('events');
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportSuccess, setExportSuccess] = useState('');

  const handleExport = async () => {
    if (!hasPermission('export')) {
      setExportError('Exporting requires analyst or admin privileges.');
      return;
    }
    setExporting(true);
    setExportError('');
    setExportSuccess('');
    try {
      const res = await exportData(format, reportType);
      const blob = new Blob([format === 'json' ? JSON.stringify(res.data, null, 2) : res.data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securemesh_${reportType}_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportSuccess(`Successfully downloaded ${reportType} report as ${format.toUpperCase()}`);
    } catch (e: any) {
      setExportError(e.response?.data?.detail || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page animate-in">
      <h1 className="page-title">Executive Reports & Data Export</h1>
      <p className="page-subtitle">Zero-trust compliance audits, threat logs, and mathematical risk evidence exports</p>

      {exportError && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{exportError}</div>}
      {exportSuccess && <div className="success-banner" style={{ marginBottom: 16 }}><CheckCircle2 size={16} />{exportSuccess}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Export configuration */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="section-title" style={{ marginBottom: 20 }}>
            <FileSpreadsheet size={18} color="var(--cyan-400)" />
            Export Telemetry & Compliance Logs
          </div>

          <div className="input-group">
            <label className="input-label">Report Dataset</label>
            <select className="input" value={reportType} onChange={e => setReportType(e.target.value)}>
              <option value="events">Security Events (All Telemetry)</option>
              <option value="alerts">Threat Detections & Alerts</option>
              <option value="risk">Mathematical Risk Assessments</option>
              <option value="audit">Tamper-Evident SHA-256 Audit Trail</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Format</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              {[
                { id: 'csv', label: 'CSV (Spreadsheet)' },
                { id: 'json', label: 'JSON (Raw Data)' },
              ].map(fmt => (
                <label key={fmt.id} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <input
                    type="radio"
                    name="format"
                    value={fmt.id}
                    checked={format === fmt.id}
                    onChange={() => setFormat(fmt.id)}
                    style={{ accentColor: 'var(--cyan-500)' }}
                  />
                  {fmt.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              className="btn btn-primary"
              onClick={handleExport}
              disabled={exporting || !hasPermission('export')}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Download size={16} />
              {exporting ? 'Generating Report...' : `Export ${reportType.toUpperCase()} (.${format})`}
            </button>
            {!hasPermission('export') && (
              <p style={{ fontSize: '0.75rem', color: 'var(--amber-400)', marginTop: 8, textAlign: 'center' }}>
                Your current role (Viewer) does not have permission to export logs.
              </p>
            )}
          </div>
        </div>

        {/* Compliance frameworks coverage summary */}
        <div className="glass" style={{ padding: 24 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>
            <ShieldCheck size={18} color="var(--green-400)" />
            Zero-Trust Compliance Frameworks
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { name: 'NIST SP 800-207', desc: 'Zero Trust Architecture core principles: continuous evaluation, least privilege.', status: 'COMPLIANT' },
              { name: 'CISA Zero Trust Maturity Model', desc: 'Identity, Device, Network, Application, and Data pillar alignment.', status: 'OPTIMAL' },
              { name: 'FIPS 140-3 Cryptography', desc: 'AES-256-GCM authenticated encryption for data-at-rest & in-transit.', status: 'VERIFIED' },
              { name: 'ISO/IEC 27001', desc: 'Tamper-evident SHA-256 hash chaining of all privileged administrative events.', status: 'AUDITED' },
            ].map(f => (
              <div key={f.name} style={{
                padding: '10px 12px',
                background: 'rgba(13, 31, 58, 0.5)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(34, 211, 238, 0.08)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{f.name}</span>
                  <span className="badge badge-low">{f.status}</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
