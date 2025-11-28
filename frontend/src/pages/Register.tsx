import React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/api';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'account' | 'success'>('email');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Step 1: Request OTP for email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.toLowerCase().endsWith('@rknec.edu')) {
      setError('Email must be an @rknec.edu address');
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setMessage(res.message || 'OTP sent to email.');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and receive verificationId
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      });
      setVerificationId(res.verificationId);
      setMessage(res.message || 'Email verified. Complete registration.');
      setStep('account');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete account creation with username/password
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!verificationId) {
      setError('Missing verification. Please verify email again.');
      setStep('email');
      return;
    }
    try {
      setLoading(true);
      const res = await apiFetch('/api/auth/complete-registration', {
        method: 'POST',
        body: JSON.stringify({ verificationId, username, password })
      });
      setMessage(res.message || 'Account created.');
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch animate-fadeIn">
        <div className="hidden md:flex bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl text-white p-8 shadow-2xl flex-col justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">Join RBU Smart Canteen</div>
            <div className="mt-2 text-white/90">Create your student account and start ordering in seconds.</div>
          </div>
          <ul className="mt-6 space-y-3 text-white/90 text-sm">
            <li className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-white rounded-full"/> RKNEC email verification for secure access</li>
            <li className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-white rounded-full"/> Personalized menu and analytics</li>
            <li className="flex items-center gap-2"><span className="inline-block w-2 h-2 bg-white rounded-full"/> Track your orders in real-time</li>
          </ul>
          <div className="text-xs text-white/70">© {new Date().getFullYear()} RBU. All rights reserved.</div>
        </div>
        <div className="bg-white/90 backdrop-blur rounded-2xl p-8 shadow-2xl flex flex-col">
          <div className="mb-6">
            <div className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">Student Registration</div>
            <div className="text-sm text-gray-500">Complete 3 quick steps with your RKNEC email</div>
          </div>
          <div className="flex items-center justify-between mb-6 text-xs font-medium text-gray-500">
            <div className="flex-1 flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 'email' || step === 'otp' || step === 'account' || step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>1</div>
              <span className={`${step === 'email' ? 'text-green-700' : ''}`}>Email</span>
            </div>
            <div className="flex-1 flex items-center gap-2 justify-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 'otp' || step === 'account' || step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>2</div>
              <span className={`${step === 'otp' ? 'text-green-700' : ''}`}>Verify</span>
            </div>
            <div className="flex-1 flex items-center gap-2 justify-end">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 'account' || step === 'success' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>3</div>
              <span className={`${step === 'account' || step === 'success' ? 'text-green-700' : ''}`}>Account</span>
            </div>
          </div>
          <div className="flex-1">
            {step === 'email' && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium text-gray-700">RKNEC Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@rknec.edu"
                    className="w-full border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 px-3 py-2 rounded-lg outline-none transition"
                  />
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {message && <div className="text-green-700 text-sm">{message}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-2.5 rounded-lg font-semibold shadow hover:from-green-700 hover:to-blue-700 disabled:opacity-60 transition"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
                <div className="text-sm text-center text-gray-600">Already have an account? <Link to="/login" className="text-green-700 hover:underline">Login</Link></div>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerify} className="space-y-4">
                <p className="text-gray-700 text-sm">Enter the 6-digit OTP sent to <span className="font-medium">{email}</span></p>
                <div>
                  <label className="block mb-1 font-medium text-gray-700">OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    required
                    className="w-full border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 px-3 py-2 rounded-lg outline-none tracking-widest text-center"
                  />
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {message && <div className="text-green-700 text-sm">{message}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-2.5 rounded-lg font-semibold shadow hover:from-green-700 hover:to-blue-700 disabled:opacity-60 transition"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <div className="text-sm text-center text-gray-600">
                  <button type="button" onClick={() => setStep('email')} className="text-gray-700 hover:underline">Change email</button>
                </div>
              </form>
            )}

            {step === 'account' && (
              <form onSubmit={handleComplete} className="space-y-4">
                <p className="text-gray-700 text-sm">Set your username and password for <span className="font-medium">{email}</span></p>
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    className="w-full border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 px-3 py-2 rounded-lg outline-none transition"
                  />
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      {showPass ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm">{error}</div>}
                {message && <div className="text-green-700 text-sm">{message}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-2.5 rounded-lg font-semibold shadow hover:from-green-700 hover:to-blue-700 disabled:opacity-60 transition"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}

            {step === 'success' && (
              <div className="text-center space-y-3">
                <div className="text-green-700 font-medium">{message || 'Account created.'}</div>
                <Link to="/login" className="inline-block text-sm font-semibold text-green-700 hover:underline">Proceed to Login</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
