import axios from 'axios';

const API_BASE = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (username: string, password: string) =>
  api.post('/api/auth/login', { username, password });

export const register = (data: {username: string; email: string; password: string; role?: string}) =>
  api.post('/api/auth/register', data);

export const logout = () => api.post('/api/auth/logout');

export const getMe = () => api.get('/api/auth/me');

// Analytics
export const getSummary = () => api.get('/api/analytics/summary');

// Events
export const getEvents = (params?: {skip?: number; limit?: number; severity?: string; event_type?: string}) =>
  api.get('/api/events', { params });

export const generateDemoEvents = () => api.post('/api/events/demo');

// Alerts
export const getAlerts = (params?: {status?: string; severity?: string; skip?: number; limit?: number}) =>
  api.get('/api/alerts', { params });

export const updateAlert = (alertId: number, data: {status: string; note?: string}) =>
  api.patch(`/api/alerts/${alertId}`, data);

// Risk
export const scoreRisk = (data: {
  identity_risk: number;
  anomaly_score: number;
  asset_criticality: number;
  policy_violation: number;
  weights?: Record<string, number>;
}) => api.post('/api/risk/score', data);

export const getRiskForEvent = (eventId: number) => api.get(`/api/risk/${eventId}`);

// Zero Trust
export const evaluateZeroTrust = (data: {
  action: string;
  asset_criticality?: number;
  identity_risk?: number;
  anomaly_score?: number;
  policy_violation?: number;
}) => api.post('/api/zero-trust/evaluate', data);

// Crypto
export const encryptFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/crypto/encrypt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const decryptFile = (ciphertext: string, nonce: string) => {
  const formData = new FormData();
  formData.append('ciphertext', ciphertext);
  formData.append('nonce', nonce);
  return api.post('/api/crypto/decrypt', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const verifyFile = (file: File, expectedHash: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('expected_hash', expectedHash);
  return api.post('/api/crypto/verify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getCryptoHistory = () => api.get('/api/crypto/history');

export const getUsers = () => api.get('/api/users');
export const registerUser = register;

// Assets
export const getAssets = () => api.get('/api/assets');
export const getAssetEdges = () => api.get('/api/assets/edges');
export const getAssetGraph = () => api.get('/api/assets/graph');

// Audit
export const getAuditRecords = (params?: {skip?: number; limit?: number}) =>
  api.get('/api/audit', { params });

export const verifyAuditChain = () => api.post('/api/audit/verify');

// Incidents
export const getIncidents = () => api.get('/api/incidents');

export const updateIncident = (id: number, data: {status?: string; severity?: string; assigned_to?: string; summary?: string}) =>
  api.patch(`/api/incidents/${id}`, data);

export const updateIncidentStatus = (id: number, status: string) =>
  updateIncident(id, { status });

export const addIncidentNote = (id: number, content: string) =>
  api.post(`/api/incidents/${id}/notes`, { content });

// Reports
export const exportReport = (format: 'csv' | 'json', reportType: string) =>
  api.get('/api/reports/export', {
    params: { format, report_type: reportType },
    responseType: 'blob',
  });

export const exportData = (format: string, reportType: string) =>
  api.get('/api/reports/export', {
    params: { format, report_type: reportType },
    responseType: format === 'json' ? 'json' : 'text',
  });

// Settings
export const getSettings = () => api.get('/api/settings');
export const updateSettings = (data: Record<string, number | boolean>) => api.patch('/api/settings', data);

// Demo
export const resetDemo = () => api.post('/api/demo/reset');
export const resetDemoData = resetDemo;

export const checkHealth = () => api.get('/api/health');

export default api;
