import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('opswatch_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('opswatch_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }).then((r) => r.data),
};

// ─── Servers ──────────────────────────────────────────────────────────────────
export const serversApi = {
  list: () => api.get('/servers').then((r) => r.data),
  get: (id: string) => api.get(`/servers/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/servers', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/servers/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/servers/${id}`).then((r) => r.data),
  stats: () => api.get('/servers/stats').then((r) => r.data),
};

// ─── Metrics ──────────────────────────────────────────────────────────────────
export const metricsApi = {
  history: (serverId: string, hours = 24) =>
    api.get(`/metrics/${serverId}/history?hours=${hours}`).then((r) => r.data),
  latest: (serverId: string) =>
    api.get(`/metrics/${serverId}/latest`).then((r) => r.data),
};

// ─── Containers ───────────────────────────────────────────────────────────────
export const containersApi = {
  list: (serverId?: string) =>
    api.get(`/containers${serverId ? `?serverId=${serverId}` : ''}`).then((r) => r.data),
  get: (id: string) => api.get(`/containers/${id}`).then((r) => r.data),
  stats: () => api.get('/containers/stats').then((r) => r.data),
  logs: (dockerId: string, tail = 100, timestamps = true) =>
    api.get(`/containers/${dockerId}/logs?tail=${tail}&timestamps=${timestamps}`).then((r) => r.data),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  rules: () => api.get('/alerts/rules').then((r) => r.data),
  createRule: (data: any) => api.post('/alerts/rules', data).then((r) => r.data),
  updateRule: (id: string, data: any) => api.put(`/alerts/rules/${id}`, data).then((r) => r.data),
  deleteRule: (id: string) => api.delete(`/alerts/rules/${id}`).then((r) => r.data),
  events: (limit = 50) => api.get(`/alerts/events?limit=${limit}`).then((r) => r.data),
};

// ─── Domains ──────────────────────────────────────────────────────────────────
export const domainsApi = {
  list: (filters?: { serverId?: string; containerName?: string; port?: string }) => {
    const params = new URLSearchParams();
    if (filters?.serverId) params.set('serverId', filters.serverId);
    if (filters?.containerName) params.set('containerName', filters.containerName);
    if (filters?.port) params.set('port', filters.port);
    const qs = params.toString();
    return api.get(`/domains${qs ? `?${qs}` : ''}`).then((r) => r.data);
  },
  get: (id: string) => api.get(`/domains/${id}`).then((r) => r.data),
  stats: () => api.get('/domains/stats').then((r) => r.data),
};

// ─── Uptime ───────────────────────────────────────────────────────────────────
export const uptimeApi = {
  list: () => api.get('/uptime').then((r) => r.data),
  get: (id: string) => api.get(`/uptime/${id}`).then((r) => r.data),
  history: (id: string, hours = 24) =>
    api.get(`/uptime/${id}/history?hours=${hours}`).then((r) => r.data),
  create: (data: any) => api.post('/uptime', data).then((r) => r.data),
  update: (id: string, data: any) => api.put(`/uptime/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/uptime/${id}`).then((r) => r.data),
};
