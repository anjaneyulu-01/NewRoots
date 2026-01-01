import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle.jsx';

function useQuery() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search), [location.search]);
}

export default function ResetPassword() {
  const query = useQuery();
  const emailParam = query.get('email') || '';
  const tokenParam = query.get('token') || '';
  const [email, setEmail] = useState(emailParam);
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');
    if (!email || !token) {
      setError('Reset link is missing required parameters.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      await api.post('/api/auth/reset-password', { email, token, password });
      setStatus('Password updated. You can now sign in.');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex transition-theme bg-hope-gray-50 dark:bg-hope-gray-900">
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-hope-green-dark bg-clip-text text-transparent mb-2">
              Reset Password
            </h1>
            <p className="text-hope-gray-600 dark:text-hope-gray-400">
              Enter a new password for your account.
            </p>
          </div>

          {status && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-300 text-sm">
              {status}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">Email</label>
              <input
                type="email"
                className="input-fiverr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">New Password</label>
              <input
                type="password"
                className="input-fiverr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">Confirm Password</label>
              <input
                type="password"
                className="input-fiverr"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <input type="hidden" value={token} readOnly />
            <button type="submit" className="w-full btn-primary py-3" disabled={loading}>
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-hope-gray-600 dark:text-hope-gray-400">
            <button className="text-primary hover:text-hope-green-dark" onClick={() => navigate('/login')}>
              Back to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
