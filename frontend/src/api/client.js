const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const TOKEN_KEY = 'auth_token';
const DOCTOR_KEY = 'auth_doctor';
const STAFF_TOKEN_KEY = 'staff_auth_token';
const STAFF_PROFILE_KEY = 'staff_auth_profile';
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

export function getStaffToken() {
  return localStorage.getItem(STAFF_TOKEN_KEY);
}

export function setStaffToken(token) {
  if (token) localStorage.setItem(STAFF_TOKEN_KEY, token);
  else localStorage.removeItem(STAFF_TOKEN_KEY);
}

export function getStoredStaff() {
  const raw = localStorage.getItem(STAFF_PROFILE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setStoredStaff(staff) {
  if (staff) localStorage.setItem(STAFF_PROFILE_KEY, JSON.stringify(staff));
  else localStorage.removeItem(STAFF_PROFILE_KEY);
}

export function clearStaffAuth() {
  setStaffToken(null);
  setStoredStaff(null);
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

async function staffRequest(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getStaffToken();
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

export function staffApiGet(path) {
  return staffRequest(path);
}

export function staffApiPost(path, body) {
  return staffRequest(path, { method: 'POST', body: JSON.stringify(body) });
}

export function staffApiPatch(path, body) {
  return staffRequest(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export function staffApiDelete(path) {
  return staffRequest(path, { method: 'DELETE' });
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
