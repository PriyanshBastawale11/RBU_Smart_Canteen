import { getToken } from '../utils/auth';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  };
  const base = process.env.REACT_APP_API_BASE_URL || '';
  const fullUrl = /^(http|https):\/\//i.test(url) ? url : `${base}${url}`;
  const res = await fetch(fullUrl, { ...options, headers });
  // Handle no-content responses and surface helpful error messages
  if (res.status === 204) return null as any;
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  if (!text) return null as any;
  try {
    return JSON.parse(text);
  } catch {
    // Fallback if server returned plain text
    return text as any;
  }
}
