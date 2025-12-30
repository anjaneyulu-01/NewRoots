import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ThemeToggle from '../components/ThemeToggle.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldError('');
    setLoading(true);
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email || !emailRe.test(email)) { setFieldError('Enter a valid email'); return; }
    if (!password || password.length < 6) { setFieldError('Password must be at least 6 characters'); return; }
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const token = res?.data?.token || res?.data?.accessToken || res?.data?.data?.token;
      if (!token) {
        setError('Login succeeded but no token returned');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', token);
      // use react-router navigation instead of logging or forcing location
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex transition-theme bg-hope-gray-50 dark:bg-hope-gray-900">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h1 className="text-5xl font-bold mb-6">Welcome back to NewRoots</h1>
          <p className="text-xl text-white/90 mb-8">
            Continue your journey to find community support, meaningful work, and a place to call home.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">✨</span>
              <div>
                <h3 className="font-semibold mb-1">Connect with Community</h3>
                <p className="text-white/80 text-sm">Join events and meet people who care</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💼</span>
              <div>
                <h3 className="font-semibold mb-1">Find Opportunities</h3>
                <p className="text-white/80 text-sm">Access job listings tailored for you</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🏠</span>
              <div>
                <h3 className="font-semibold mb-1">Secure Housing</h3>
                <p className="text-white/80 text-sm">Browse affordable housing options</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-hope-green-dark bg-clip-text text-transparent mb-2">
              Sign in to NewRoots
            </h1>
            <p className="text-hope-gray-600 dark:text-hope-gray-400">
              Access your dashboard and continue building your future
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                className="input-fiverr"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {fieldError && <div className="text-xs text-red-600 mt-1">{fieldError}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                className="input-fiverr"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="w-full btn-primary py-3 text-base" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-hope-gray-600 dark:text-hope-gray-400">
              Don't have an account?{' '}
              <a href="#/register" className="text-primary hover:text-hope-green-dark font-semibold transition-colors">
                Join NewRoots today
              </a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-hope-gray-200 dark:border-hope-gray-700 text-center">
            <p className="text-xs text-hope-gray-500 dark:text-hope-gray-500">
              By continuing, you agree to NewRoots' Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
