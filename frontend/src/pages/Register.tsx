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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <h1 className="text-3xl font-bold mb-4">Student Registration</h1>
      {step === 'email' && (
        <form onSubmit={handleRequestOtp} className="bg-white p-6 rounded shadow w-full max-w-md">
          <div className="mb-4">
            <label className="block mb-1 font-medium">RKNEC Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@rknec.edu"
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
          {message && <div className="mb-2 text-green-700 text-sm">{message}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
          <div className="mt-3 text-sm text-center">
            <Link to="/login" className="text-green-700 hover:underline">Already have an account? Login</Link>
          </div>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerify} className="bg-white p-6 rounded shadow w-full max-w-md">
          <p className="mb-4 text-gray-700">Enter the 6-digit OTP sent to <span className="font-medium">{email}</span></p>
          <div className="mb-4">
            <label className="block mb-1 font-medium">OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded tracking-widest text-center"
            />
          </div>
          {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
          {message && <div className="mb-2 text-green-700 text-sm">{message}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
          <div className="mt-3 text-sm text-center">
            <button type="button" onClick={() => setStep('email')} className="text-gray-600 hover:underline">Change email</button>
          </div>
        </form>
      )}

      {step === 'account' && (
        <form onSubmit={handleComplete} className="bg-white p-6 rounded shadow w-full max-w-md">
          <p className="mb-4 text-gray-700">Set your username and password for <span className="font-medium">{email}</span></p>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>
          {error && <div className="mb-2 text-red-600 text-sm">{error}</div>}
          {message && <div className="mb-2 text-green-700 text-sm">{message}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      )}

      {step === 'success' && (
        <div className="bg-white p-6 rounded shadow w-full max-w-md text-center">
          <div className="text-green-700 font-medium mb-2">{message || 'Account created.'}</div>
          <Link to="/login" className="text-green-700 hover:underline">Proceed to Login</Link>
        </div>
      )}
    </div>
  );
};

export default Register;
