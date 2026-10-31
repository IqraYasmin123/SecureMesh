import React, { useEffect, useState } from 'react';
import { getIncidents, addIncidentNote, updateIncidentStatus } from '../api/client';
import { SeverityBadge, StatusBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Plus, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';

export default function IncidentsPage() {
  const { hasPermission } = useAuth();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getIncidents();
      setIncidents(res.data.incidents);
      setTotal(res.data.total);
      if (res.data.incidents.length > 0 && !selectedIncident) {
        setSelectedIncident(res.data.incidents[0]);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (incId: number, newStatus: string) => {
    try {
      await updateIncidentStatus(incId, newStatus);
      await load();
      if (selectedIncident?.id === incId) {
        setSelectedIncident((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedIncident) return;
    setSubmittingNote(true);
    try {
      await addIncidentNote(selectedIncident.id, newNote.trim());
      setNewNote('');
      await load();
      // Update selected
      const updated = incidents.find(i => i.id === selectedIncident.id);
      if (updated) setSelectedIncident(updated);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="page animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Incident Response & War Room</h1>
          <p className="page-subtitle">Security Operations Center (SOC) triage, mitigation lifecycle, and forensic notes</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertCircle size={16} />{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Incident List */}
        <div className="table-container">
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={16} color="var(--red-400)" />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Active Security Incidents ({total})</span>
          </div>
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
            </div>
          ) : incidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No incidents reported</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Incident</th>
                  <th>Assignee</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map(inc => {
                  const isSel = selectedIncident?.id === inc.id;
                  return (
                    <tr
                      key={inc.id}
                      onClick={() => setSelectedIncident(inc)}
                      style={{ cursor: 'pointer', background: isSel ? 'rgba(34,211,238,0.08)' : undefined }}
                    >
                      <td><SeverityBadge severity={inc.severity} /></td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{inc.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID #{inc.id}</div>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{inc.assignee || 'Unassigned'}</td>
                      <td><StatusBadge status={inc.status} /></td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{new Date(inc.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Selected Incident View & War Room */}
        {selectedIncident ? (
          <div className="glass" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Incident #{selectedIncident.id}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SeverityBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} />
                </div>
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {selectedIncident.title}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {selectedIncident.description}
              </p>
            </div>

            {/* Status change actions */}
            {hasPermission('write') && (
              <div style={{ padding: 12, background: 'rgba(13, 31, 58, 0.6)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Workflow Stage</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['investigating', 'contained', 'resolved'].map(st => (
                    <button
                      key={st}
                      className={`btn btn-sm ${selectedIncident.status === st ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => handleStatusChange(selectedIncident.id, st)}
                      style={{ textTransform: 'capitalize' }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes / Timeline */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <MessageSquare size={16} color="var(--cyan-400)" />
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>Forensic Notes ({selectedIncident.notes?.length || 0})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                {(selectedIncident.notes || []).map((n: any) => (
                  <div key={n.id} style={{
                    padding: '8px 12px',
                    background: 'rgba(2, 6, 23, 0.5)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(34, 211, 238, 0.08)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <strong style={{ color: 'var(--cyan-400)' }}>{n.author}</strong>
                      <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{n.content}</div>
                  </div>
                ))}
              </div>

              {/* Add note form */}
              {hasPermission('write') && (
                <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Add forensic evidence or status note..."
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={submittingNote}>
                    <Plus size={14} /> Add
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="glass" style={{ padding: 32, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>Select an incident to view details</span>
          </div>
        )}
      </div>
    </div>
  );
}
