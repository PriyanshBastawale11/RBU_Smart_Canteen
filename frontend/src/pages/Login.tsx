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

  const [showPass, setShowPass] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-fadeIn">
        <div className="hidden md:flex bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl text-white p-8 shadow-2xl flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">RBU Smart Canteen</div>
            <div className="mt-2 text-white/90">Fast, smart and secure ordering experience.</div>
          </div>
          <ul className="mt-6 space-y-3 text-white/90 text-sm">
            <li className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-white rounded-full"/> One-tap payments</li>
            <li className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-white rounded-full"/> Real-time order tracking</li>
            <li className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-white rounded-full"/> Personalized analytics</li>
          </ul>
          <div className="text-xs text-white/70">© {new Date().getFullYear()} RBU. All rights reserved.</div>
        </div>
        <div className="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">Welcome back</div>
            <div className="text-sm text-gray-500">Sign in to continue</div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium text-gray-700">Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 px-3 py-2 rounded-lg outline-none transition"
                  placeholder="Enter your username"
                />
              </div>
            </div>
            <div>
              <label className="block mb-1 font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 rounded-lg outline-none transition pr-16"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">{showPass ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <button type="submit" className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-2.5 rounded-lg font-semibold shadow hover:from-green-700 hover:to-blue-700 transition">
              Sign in
            </button>
            <div className="text-sm text-center text-gray-600">No account? <Link to="/register" className="text-green-700 hover:underline">Create a student account</Link></div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
