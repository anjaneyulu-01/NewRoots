import React, { useState } from 'react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import axios from 'axios';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    // client-side validation
    const errs = {};
    if (!name || name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    const emailRe = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email || !emailRe.test(email)) errs.email = 'Enter a valid email address';
    if (!password || password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    try {
      const res = await axios.post('/api/auth/register', { name, email, password });
      localStorage.setItem('token', res.data.token);
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex transition-theme bg-hope-gray-50 dark:bg-hope-gray-900">
      {/* Left Side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h1 className="text-5xl font-bold mb-6">Start Your Journey with NewRoots</h1>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of new migrants finding support, opportunities, and a sense of belonging.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🌟</span>
              <div>
                <h3 className="font-semibold mb-1">Free to Join</h3>
                <p className="text-white/80 text-sm">No hidden fees, just pure support</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🤝</span>
              <div>
                <h3 className="font-semibold mb-1">Community Driven</h3>
                <p className="text-white/80 text-sm">Built by migrants, for migrants</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h3 className="font-semibold mb-1">Fast & Simple</h3>
                <p className="text-white/80 text-sm">Get started in just 2 minutes</p>
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
              Create your account
            </h1>
            <p className="text-hope-gray-600 dark:text-hope-gray-400">
              Join NewRoots and unlock all features for free
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
                Full Name
              </label>
              <input
                type="text"
                className="input-fiverr"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              {fieldErrors.name && <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>}
            </div>

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
              {fieldErrors.email && <div className="text-xs text-red-600 mt-1">{fieldErrors.email}</div>}
            </div>

            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                className="input-fiverr"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-hope-gray-500">
                Must be at least 8 characters
              </p>
              {fieldErrors.password && <div className="text-xs text-red-600 mt-1">{fieldErrors.password}</div>}
            </div>

            <button type="submit" className="w-full btn-primary py-3 text-base">
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-hope-gray-600 dark:text-hope-gray-400">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:text-hope-green-dark font-semibold transition-colors">
                Sign in
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
