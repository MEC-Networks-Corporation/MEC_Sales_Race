const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function getToken() {
  return localStorage.getItem('race_admin_token') || null;
}

export function setToken(token) {
  if (token) localStorage.setItem('race_admin_token', token);
  else localStorage.removeItem('race_admin_token');
}

async function request(path, { method = 'GET', body, isForm = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no JSON body (e.g. 204) — fine
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.errors = data?.errors;
    throw error;
  }

  return data;
}

export const api = {
  getTeam: () => request('/team'),
  getDraftTeam: () => request('/team-members/draft'),
  publish: () => request('/publish', { method: 'POST' }),
  login: (email, password) => request('/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/logout', { method: 'POST' }),
  me: () => request('/me'),
  createMember: (member) => request('/team-members', { method: 'POST', body: member }),
  updateMember: (id, patch) => request(`/team-members/${id}`, { method: 'PUT', body: patch }),
  deleteMember: (id) => request(`/team-members/${id}`, { method: 'DELETE' }),
  undoLastChange: () => request('/team-members/undo', { method: 'POST' }),
  clearAll: () => request('/team-members', { method: 'DELETE' }),
  importRows: (rows, mode) => request('/team-members/import', { method: 'POST', body: { rows, mode } }),
  updateSettings: (quarter, year) => request('/settings', { method: 'PUT', body: { quarter, year } }),
  listAdmins: () => request('/admin-users'),
  createAdmin: (admin) => request('/admin-users', { method: 'POST', body: admin }),
  deleteAdmin: (id) => request(`/admin-users/${id}`, { method: 'DELETE' }),
  uploadPhoto: (id, file) => {
    const form = new FormData();
    form.append('photo', file);
    return request(`/team-members/${id}/photo`, { method: 'POST', body: form, isForm: true });
  },
};
