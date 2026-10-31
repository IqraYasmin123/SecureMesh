import React, { useEffect, useState } from 'react';
import { getUsers, registerUser } from '../api/client';
import { RoleBadge } from '../components/Badges';
import { useAuth } from '../context/AuthContext';
import { Users, UserPlus, Shield, Key, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const ROLE_DESCRIPTIONS = {
  admin: 'Full system administration, zero-trust threshold modification, user management, and sensitive key operations.',
  analyst: 'Security monitoring, alert triage & resolution, risk analysis simulation, and data export.',
  viewer: 'Read-only access to dashboards, audit logs, and compliance reports.',
};

export default function IdentityPage() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New user form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('analyst');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers();
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) return;
    setCreating(true);
    setError('');
    setCreateMsg('');
    try {
      await registerUser({ username, email, password, role });
      setCreateMsg(`User ${username} created successfully with role ${role.toUpperCase()}`);
      setUsername('');
      setEmail('');
      setPassword('');
      setShowModal(false);
      await load();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page animate-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Identity & Access Management</h1>
          <p className="page-subtitle">Cryptographic identity profiles, Role-Based Access Control (RBAC), and session privileges</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
          {hasPermission('manage_users') && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <UserPlus size={14} />Create Identity
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}><AlertTriangle size={16} />{error}</div>}
      {createMsg && <div className="success-banner" style={{ marginBottom: 16 }}><CheckCircle size={16} />{createMsg}</div>}

      {/* RBAC Overview Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {Object.entries(ROLE_DESCRIPTIONS).map(([rName, desc]) => (
          <div key={rName} className="glass" style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <RoleBadge role={rName} />
              <Key size={16} color="var(--cyan-400)" />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
              {desc}
            </p>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Identities assigned: <strong style={{ color: 'var(--cyan-400)' }}>{users.filter(u => u.role === rName).length}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* User Directory */}
      <div className="table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={16} color="var(--cyan-400)" />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Identity Directory ({total})</span>
        </div>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 48 }} />)}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Identity</th>
                <th>Email</th>
                <th>Role</th>
                <th>MFA Status</th>
                <th>Created At</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: u.role === 'admin' ? 'linear-gradient(135deg, var(--violet-600), var(--blue-700))' : 'linear-gradient(135deg, var(--cyan-600), var(--blue-600))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, color: 'white'
                      }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{u.username}</div>
                        {u.username === currentUser?.username && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--cyan-400)', fontWeight: 600 }}>[CURRENT USER]</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <span style={{ fontSize: '0.78rem', color: u.mfa_enabled ? 'var(--green-400)' : 'var(--amber-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Shield size={12} />
                      {u.mfa_enabled ? 'Enforced' : 'Optional'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <span className="badge badge-low">ACTIVE</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Create User */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.75)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
          <div className="glass" style={{ width: '100%', maxWidth: 440, padding: 28 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={20} color="var(--cyan-400)" />
              Provision New Identity
            </h2>
            <form onSubmit={handleCreateUser}>
              <div className="input-group">
                <label className="input-label">Username</label>
                <input className="input" value={username} onChange={e => setUsername(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Initial Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="input-group">
                <label className="input-label">Access Role</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="analyst">Analyst (Triage & Alert Response)</option>
                  <option value="viewer">Viewer (Read-Only Compliance)</option>
                  <option value="admin">Administrator (Full Control)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Provisioning...' : 'Provision Identity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
