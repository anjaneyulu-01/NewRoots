import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email || !emailRe.test(email)) {
      setError('Enter a valid email');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/api/auth/forgot-password', { email });
      setStatus(response.data.message || 'Password reset link has been sent to your email. Check your inbox.');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset link');
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
              Forgot Password
            </h1>
            <p className="text-hope-gray-600 dark:text-hope-gray-400">
              We'll email you a link to reset your password.
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
              {error === 'There is no account with this email. Please create an account first.' && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-xs mb-2">Don't have an account yet?</p>
                  <button 
                    type="button" 
                    onClick={() => navigate('/register')}
                    className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 underline text-xs font-semibold"
                  >
                    Create an account
                  </button>
                </div>
              )}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">Email</label>
              <input
                type="email"
                className="input-fiverr"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="w-full btn-primary py-3" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
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
