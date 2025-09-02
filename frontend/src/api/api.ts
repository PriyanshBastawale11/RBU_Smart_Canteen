import { getToken } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include' as RequestCredentials,
  };
  
  const res = await fetch(fullUrl, config);
  if (!res.ok) {
    const error = await res.text().catch(() => 'Unknown error occurred');
    throw new Error(error || `HTTP error! status: ${res.status}`);
  }
  
  // Handle empty responses
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
