const API_URL = 'http://localhost:5000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'x-auth-token': localStorage.getItem('forgeToken') || ''
});

export const api = {
  // Auth
  async login(identifier, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'Login failed');
    localStorage.setItem('forgeToken', data.token);
    localStorage.setItem('forgeUser', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('forgeToken');
    localStorage.removeItem('forgeUser');
  },

  getMe: () => api.fetch('/auth/me'),
  updateProfile: (data) => api.fetch('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),

  // Generic
  async fetch(endpoint, options = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: { ...getHeaders(), ...options.headers }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || 'API Request failed');
    return data;
  },

  // Resources
  getStats: () => api.fetch('/stats/overview'),
  getActivity: () => api.fetch('/activity'),
  getSessions: () => api.fetch('/sessions'),
  deleteSession: (id) => api.fetch(`/sessions/${id}`, { method: 'DELETE' }),
  getStudents: () => api.fetch('/students'),
  getAttendance: (sid) => api.fetch(`/attendance/${sid}`),
  upsertAttendance: (data) => api.fetch('/attendance', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  getMaterials: () => api.fetch('/materials'),
  addMaterial: (data) => api.fetch('/materials', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteMaterial: (id) => api.fetch(`/materials/${id}`, { method: 'DELETE' }),
  getStudentHistory: () => api.fetch('/me/attendance'),
  getAnyStudentHistory: (id) => api.fetch(`/students/${id}/attendance`),
  
  // AI Agent & CSV Import
  mapCsv: (headers, sampleData) => api.fetch('/ai/map-csv', {
    method: 'POST',
    body: JSON.stringify({ headers, sampleData })
  }),
  previewImport: (payload) => api.fetch('/attendance/preview-import', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  bulkAddAttendance: (records, options = {}) => api.fetch('/attendance/bulk-import', {
    method: 'POST',
    body: JSON.stringify({ records, ...options })
  }),
  bulkAddStudents: (data) => api.fetch('/students/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};
