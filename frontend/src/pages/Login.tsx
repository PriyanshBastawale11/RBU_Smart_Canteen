import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { setToken, setUserId, setUsername as setUsernameLS, setEmail as setEmailLS } from '../utils/auth';

import { apiFetch } from '../api/api';
const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: username.trim(), password })
      });
      setToken(data.token);
      localStorage.setItem('roles', JSON.stringify(data.roles));
      if (typeof data.id === 'number') {
        setUserId(data.id);
      }
      if (data.username) {
        setUsernameLS(String(data.username));
      }
      if (data.email) {
        setEmailLS(String(data.email));
      }
      // Redirect based on role
      if (data.roles.includes('ADMIN') || data.roles.includes('STAFF')) {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold mb-4">RBU Smart Canteen Login</h1>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-80">
        <div className="mb-4">
          <label className="block mb-1 font-medium">Username</label>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full border px-3 py-2 rounded" />
        </div>
        {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
        <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">Login</button>
        <div className="mt-3 text-sm text-center">
          <Link to="/register" className="text-green-700 hover:underline">Create a student account</Link>
        </div>
      </form>
    </div>
  );
};

export default Login;
