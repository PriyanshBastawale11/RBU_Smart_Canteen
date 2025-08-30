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
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
