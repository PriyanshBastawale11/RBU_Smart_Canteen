export function getToken() {
  return localStorage.getItem('jwt');
}

export function setToken(token: string) {
  localStorage.setItem('jwt', token);
}

export function removeToken() {
  localStorage.removeItem('jwt');
  localStorage.removeItem('roles');
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  localStorage.removeItem('email');
}

export function decodeToken(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function getUserRoles(): string[] {
  const token = getToken();
  if (!token) return [];
  const payload = decodeToken(token);
  // If roles are not in JWT, store them in localStorage on login
  const roles = localStorage.getItem('roles');
  return roles ? JSON.parse(roles) : (payload?.roles || []);
}

export function isAuthenticated() {
  return !!getToken();
}

export function setUserId(id: number) {
  if (typeof id === 'number' && !Number.isNaN(id)) {
    localStorage.setItem('userId', String(id));
  }
}

export function getUserId(): number | null {
  const raw = localStorage.getItem('userId');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isNaN(n) ? null : n;
}

export function setUsername(username: string) {
  if (typeof username === 'string' && username.trim()) {
    localStorage.setItem('username', username.trim());
  }
}

export function getUsername(): string | null {
  const u = localStorage.getItem('username');
  return u && u.trim() ? u : null;
}

export function setEmail(email: string) {
  if (typeof email === 'string' && email.includes('@')) {
    localStorage.setItem('email', email.trim());
  }
}

export function getEmail(): string | null {
  const e = localStorage.getItem('email');
  return e && e.includes('@') ? e : null;
}
