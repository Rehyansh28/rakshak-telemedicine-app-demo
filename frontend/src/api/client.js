const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'auth_token';
const DOCTOR_KEY = 'auth_doctor';
const ADMIN_TOKEN_KEY = 'admin_auth_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getStoredDoctor() {
  const raw = localStorage.getItem(DOCTOR_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredDoctor(doctor) {
  if (doctor) localStorage.setItem(DOCTOR_KEY, JSON.stringify(doctor));
  else localStorage.removeItem(DOCTOR_KEY);
}

export function clearAuth() {
  setToken(null);
  setStoredDoctor(null);
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
  if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
  else localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function apiGet(path) {
  return request(path);
}

export function apiPost(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) });
}

async function adminRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getAdminToken();
  if (token) headers.Authorization = `Token ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function adminApiGet(path) {
  return adminRequest(path);
}

export function adminApiPost(path, body) {
  return adminRequest(path, { method: 'POST', body: JSON.stringify(body) });
}

export function adminApiPatch(path, body) {
  return adminRequest(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function adminApiDelete(path) {
  return adminRequest(path, { method: 'DELETE' });
}
