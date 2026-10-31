import React, { useState } from 'react';
import { encryptFile, decryptFile, verifyFile, getCryptoHistory } from '../api/client';
import { Lock, Upload, Eye, CheckSquare, Hash, AlertTriangle, CheckCircle, History } from 'lucide-react';
import { useEffect } from 'react';

type Tab = 'encrypt' | 'decrypt' | 'verify' | 'history';

export default function CryptoPage() {
  const [tab, setTab] = useState<Tab>('encrypt');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Encrypt state
  const [encFile, setEncFile] = useState<File | null>(null);
  const [encResult, setEncResult] = useState<any>(null);

  // Decrypt state
  const [ciphertext, setCiphertext] = useState('');
  const [nonce, setNonce] = useState('');
  const [decResult, setDecResult] = useState<any>(null);

  // Verify state
  const [verifyFile2, setVerifyFile2] = useState<File | null>(null);
  const [expectedHash, setExpectedHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await getCryptoHistory();
      setHistory(res.data.records);
    } catch {}
    finally { setHistoryLoading(false); }
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const handleEncrypt = async () => {
    if (!encFile) return;
    setLoading(true); setError('');
    try {
      const res = await encryptFile(encFile);
      setEncResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Encryption failed');
    } finally { setLoading(false); }
  };

  const handleDecrypt = async () => {
    if (!ciphertext || !nonce) return;
    setLoading(true); setError('');
    try {
      const res = await decryptFile(ciphertext, nonce);
      setDecResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Decryption failed');
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (!verifyFile2 || !expectedHash) return;
    setLoading(true); setError('');
    try {
      const res = await verifyFile(verifyFile2, expectedHash);
      setVerifyResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Verification failed');
    } finally { setLoading(false); }
  };

  const useEncResultForDecrypt = () => {
    if (!encResult) return;
    setCiphertext(encResult.ciphertext);
    setNonce(encResult.nonce);
    setTab('decrypt');
  };

  return (
    <div className="page animate-in">
      <h1 className="page-title">Cryptography Lab</h1>
      <p className="page-subtitle">AES-256-GCM authenticated file encryption, hardware-grade integrity verification, and SHA-256 cryptographic hashing</p>

      {/* Algorithm info */}
      <div className="glass-sm" style={{ padding: 14, marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Algorithm', value: 'AES-256-GCM' },
          { label: 'Key Size', value: '256-bit' },
          { label: 'Nonce', value: '96-bit (unique per op)' },
          { label: 'Auth Tag', value: '128-bit' },
          { label: 'Integrity Hash', value: 'SHA-256' },
          { label: 'Max File Size', value: '10 MB' },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--cyan-400)', fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'encrypt', label: 'Encrypt', icon: Lock },
          { id: 'decrypt', label: 'Decrypt', icon: Eye },
          { id: 'verify', label: 'Verify Integrity', icon: CheckSquare },
          { id: 'history', label: 'Operation History', icon: History },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id as Tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{error}</div>}

      {/* Encrypt Tab */}
      {tab === 'encrypt' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginBottom: 20 }}><Lock size={16} color="var(--cyan-400)" />Encrypt File</div>

            <div
              onClick={() => document.getElementById('enc-file-input')?.click()}
              style={{
                border: '2px dashed rgba(34,211,238,0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '32px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 20,
                transition: 'all 150ms ease',
                background: encFile ? 'rgba(34,211,238,0.05)' : undefined,
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(34,211,238,0.2)')}
            >
              <Upload size={24} color="var(--text-muted)" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.875rem', color: encFile ? 'var(--cyan-400)' : 'var(--text-muted)', fontWeight: 600 }}>
                {encFile ? encFile.name : 'Click to select file'}
              </div>
              {encFile && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {(encFile.size / 1024).toFixed(1)} KB
                </div>
              )}
              <input id="enc-file-input" type="file" style={{ display: 'none' }} onChange={e => setEncFile(e.target.files?.[0] || null)} />
            </div>

            <button className="btn btn-primary" onClick={handleEncrypt} disabled={!encFile || loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Encrypting...' : 'Encrypt with AES-256-GCM'}
            </button>
          </div>

          {encResult && (
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle size={18} color="var(--green-400)" />
                <span style={{ fontWeight: 700, color: 'var(--green-400)' }}>Encryption Successful</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Nonce (96-bit)</div>
                  <div className="code-block" style={{ wordBreak: 'break-all', fontSize: '0.72rem' }}>{encResult.nonce}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Ciphertext + Auth Tag (base64)</div>
                  <div className="code-block" style={{ maxHeight: 80, overflow: 'hidden', fontSize: '0.68rem' }}>
                    {encResult.ciphertext.substring(0, 120)}...
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Original SHA-256</div>
                  <div className="code-block" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{encResult.original_sha256}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ciphertext Size</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{encResult.ciphertext_size} bytes</div>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={useEncResultForDecrypt}>
                  Use this for Decryption →
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setExpectedHash(encResult.original_sha256);
                    setTab('verify');
                  }}
                >
                  Verify Integrity with SHA-256 →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decrypt Tab */}
      {tab === 'decrypt' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginBottom: 20 }}><Eye size={16} color="var(--blue-400)" />Decrypt File</div>
            <div className="input-group">
              <label className="input-label">Nonce (base64)</label>
              <input className="input" value={nonce} onChange={e => setNonce(e.target.value)} placeholder="Paste nonce from encryption result" />
            </div>
            <div className="input-group">
              <label className="input-label">Ciphertext (base64, includes auth tag)</label>
              <textarea className="input" rows={4} value={ciphertext} onChange={e => setCiphertext(e.target.value)} placeholder="Paste ciphertext from encryption result" style={{ resize: 'vertical' }} />
            </div>
            <button className="btn btn-primary" onClick={handleDecrypt} disabled={!ciphertext || !nonce || loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Decrypting...' : 'Decrypt & Verify Auth Tag'}
            </button>
          </div>

          {decResult && (
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle size={18} color="var(--green-400)" />
                <span style={{ fontWeight: 700, color: 'var(--green-400)' }}>Decryption Successful</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--green-400)', marginBottom: 16 }}>{decResult.message}</div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Decrypted SHA-256</div>
                <div className="code-block" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{decResult.sha256}</div>
              </div>
              <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Size: {decResult.size} bytes
              </div>
              <div style={{ marginTop: 12, padding: 10, background: 'rgba(16,185,129,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--green-400)' }}>
                  ✓ Authentication tag verified — data integrity confirmed. If the ciphertext had been tampered with, decryption would have failed.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Verify Tab */}
      {tab === 'verify' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="glass" style={{ padding: 24 }}>
            <div className="section-title" style={{ marginBottom: 20 }}><Hash size={16} color="var(--violet-400)" />SHA-256 Integrity Verification</div>
            <div
              onClick={() => document.getElementById('verify-file-input')?.click()}
              style={{
                border: '2px dashed rgba(139,92,246,0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                textAlign: 'center',
                cursor: 'pointer',
                marginBottom: 16,
              }}
            >
              <Upload size={20} color="var(--text-muted)" style={{ display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.875rem', color: verifyFile2 ? 'var(--violet-400)' : 'var(--text-muted)', fontWeight: 600 }}>
                {verifyFile2 ? verifyFile2.name : 'Select file to verify'}
              </div>
              <input id="verify-file-input" type="file" style={{ display: 'none' }} onChange={e => setVerifyFile2(e.target.files?.[0] || null)} />
            </div>
            <div className="input-group">
              <label className="input-label">Expected SHA-256 Hash</label>
              <input className="input" value={expectedHash} onChange={e => setExpectedHash(e.target.value)} placeholder="sha256 hex digest (64 chars)" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }} />
            </div>
            <button className="btn btn-primary" onClick={handleVerify} disabled={!verifyFile2 || !expectedHash || loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? 'Verifying...' : 'Verify Integrity'}
            </button>
          </div>

          {verifyResult && (
            <div className="glass" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                {verifyResult.match ? (
                  <><CheckCircle size={20} color="var(--green-400)" /><span style={{ fontWeight: 700, color: 'var(--green-400)', fontSize: '1.1rem' }}>Integrity Verified ✓</span></>
                ) : (
                  <><AlertTriangle size={20} color="var(--red-400)" /><span style={{ fontWeight: 700, color: 'var(--red-400)', fontSize: '1.1rem' }}>Integrity FAILED ✗</span></>
                )}
              </div>
              <div style={{ marginBottom: 16, fontSize: '0.85rem', color: verifyResult.match ? 'var(--green-400)' : 'var(--red-400)' }}>
                {verifyResult.message}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Actual Hash</div>
                  <div className="code-block" style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: verifyResult.match ? 'var(--green-400)' : 'var(--red-400)' }}>{verifyResult.actual_hash}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Expected Hash</div>
                  <div className="code-block" style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{verifyResult.expected_hash}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="table-container">
          {historyLoading ? (
            <div style={{ padding: 32 }}><div className="skeleton" style={{ height: 200 }} /></div>
          ) : history.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">No operations yet</div></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>SHA-256</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map(rec => (
                  <tr key={rec.id}>
                    <td><span className={`badge badge-${rec.operation === 'encrypt' ? 'medium' : rec.operation === 'decrypt' ? 'low' : 'high'}`}>{rec.operation}</span></td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>{rec.filename}</td>
                    <td>{rec.file_size ? `${rec.file_size} B` : '—'}</td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem', color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rec.sha256_hash || '—'}
                    </td>
                    <td><span className={`badge badge-${rec.success ? 'low' : 'critical'}`}>{rec.success ? 'SUCCESS' : 'FAILED'}</span></td>
                    <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(rec.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
