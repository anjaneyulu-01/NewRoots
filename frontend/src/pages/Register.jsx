import React, { useState, useEffect, useRef } from 'react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import api from '../api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmailAddress, setSentEmailAddress] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const otpTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const googleButtonRef = React.useRef(null);

  // Example: Access Google Maps API key from environment
  // GOOGLE_MAPS_API_KEY is set in Render dashboard and .env for local
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  React.useEffect(() => {
    // load Google Identity Services if client id provided
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;
    const scriptId = 'google-client-script';
    if (document.getElementById(scriptId)) return;
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => {
      try {
        /* global google */
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp) => {
            try {
              const res = await api.post('/api/auth/google', { idToken: resp.credential });
              localStorage.setItem('token', res.data.token);
              window.location.href = '#/';
            } catch (err) {
              setError(err.response?.data?.error || 'Google sign-in failed');
            }
          },
        });
        if (googleButtonRef.current) {
          window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large' });
        }
      } catch (e) {
        console.warn('Google Identity init failed', e);
      }
    };
    s.id = scriptId;
    document.head.appendChild(s);
  }, []);

  // re-validate email on change and clear OTP state when email becomes invalid
  useEffect(() => {
    if (!email) {
      // if email cleared, also clear sent email
      setSentEmailAddress('');
      setEmailValid(false);
      setEmailSent(false);
      return;
    }
    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const valid = re.test(email);
    setEmailValid(valid);
    if (!valid) {
      // clear OTP state and timers so OTP UI hides immediately
      setEmailSent(false);
      setOtp('');
      setOtpError('');
      setSuccessMessage('');
      setResendCooldown(0);
      setOtpCountdown(0);
      if (otpTimerRef.current) { clearInterval(otpTimerRef.current); otpTimerRef.current = null; }
      if (cooldownTimerRef.current) { clearInterval(cooldownTimerRef.current); cooldownTimerRef.current = null; }
    }
    // if the user edits the email away from the one we sent to, hide OTP UI
    if (sentEmailAddress && email !== sentEmailAddress) {
      setEmailSent(false);
      setOtp('');
      setOtpError('');
    }
  }, [email]);

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
    // require email to be OTP-verified before registering
    if (!emailVerified) {
      setError('Please verify your email using the OTP sent to your address');
      return;
    }
    try {
      const res = await api.post('/api/auth/register-with-otp', { name, email, password, code: otp });
      // registration endpoint currently returns message; if it returns token adjust accordingly
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      window.location.href = '#/login';
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  const sendOtp = async () => {
    setOtpError('');
    setSuccessMessage('');
    if (!email) { setOtpError('Enter a valid email'); return; }
    try {
      setSending(true);
      const res = await api.post('/api/auth/send-email-otp', { email });
      setEmailSent(true);
      setSentEmailAddress(email);
      setResendCooldown(60);
      setOtpCountdown(10 * 60);
      // start cooldown timer
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = setInterval(() => setResendCooldown((s) => { if (s <= 1) { clearInterval(cooldownTimerRef.current); return 0; } return s - 1; }), 1000);
      // start otp expiry timer
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
      otpTimerRef.current = setInterval(() => setOtpCountdown((s) => { if (s <= 1) { clearInterval(otpTimerRef.current); return 0; } return s - 1; }), 1000);
      setSuccessMessage(res.data?.message || 'OTP sent to your email');
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setSending(false);
    }
  };

  // removed auto-send on email blur; OTP will be requested after password is entered

  const verifyOtp = async () => {
    setOtpError('');
    setSuccessMessage('');
    if (!otp || otp.trim().length === 0) { setOtpError('Enter the OTP'); return; }
    try {
      setVerifying(true);
      // First verify OTP only
      const verifyRes = await api.post('/api/auth/verify-email-otp', { email, code: otp });
      if (verifyRes.data && verifyRes.data.success) {
        setEmailVerified(true);
        setSuccessMessage('Email verified! You can now create your account.');
        setOtpError('');
      } else {
        setOtpError('Invalid or expired OTP');
        setEmailVerified(false);
        return;
      }
    } catch (err) {
      setOtpError(err.response?.data?.error || 'Invalid OTP');
      setEmailVerified(false);
      console.error('verifyOtp error', err);
      return;
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    return () => {
      if (otpTimerRef.current) clearInterval(otpTimerRef.current);
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  // hide OTP UI when countdown reaches zero
  useEffect(() => {
    if (otpCountdown === 0 && sentEmailAddress) {
      setEmailSent(false);
      setSentEmailAddress('');
    }
  }, [otpCountdown, sentEmailAddress]);

  function formatCountdown(s) {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

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
              <div className="flex gap-2">
                <input
                  type="email"
                  className={`input-fiverr flex-1 ${emailTouched && !emailValid ? 'border-rose-600 focus:border-rose-600' : ''}`}
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmail(v);
                    setEmailVerified(false);
                    setEmailTouched(true);
                    const re = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
                    setEmailValid(re.test(v));
                  }}
                  required
                  disabled={emailVerified}
                />
                {emailVerified && (
                  <div className="p-2 bg-green-50 text-green-700 rounded text-sm">Verified</div>
                )}
              </div>
              {fieldErrors.email && <div className="text-xs text-red-600 mt-1">{fieldErrors.email}</div>}
              {emailTouched && !emailValid && (
                <div className="text-xs text-red-600 mt-1">Enter a valid email address</div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-hope-gray-700 dark:text-hope-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-fiverr"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" tabIndex={0} onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-2 text-sm text-hope-gray-500" aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-xs text-hope-gray-500">
                Must be at least 8 characters
              </p>
              {fieldErrors.password && <div className="text-xs text-red-600 mt-1">{fieldErrors.password}</div>}
            </div>

            {/* OTP section: shown after password is entered (or when user clicks Send OTP) */}
            <div>
              {!emailVerified && emailValid && (
                <div className="mt-2">
                  <button type="button" onClick={sendOtp} className="btn-secondary" disabled={sending || resendCooldown > 0} aria-disabled={sending || resendCooldown > 0}>
                    {sending ? 'Sending...' : (resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Send OTP to verify email')}
                  </button>
                </div>
              )}
              {!emailVerified && !emailValid && (
                <div className="mt-2 text-xs text-rose-600">Enter a valid email to enable sending OTP</div>
              )}

              {emailSent && !emailVerified && (
                <div className="mt-2">
                  {successMessage && (
                    <div className="mb-2 p-2 bg-green-50 text-green-700 rounded text-sm">
                      {successMessage} {sentEmailAddress ? `to ${sentEmailAddress}` : ''}
                    </div>
                  )}
                  <label className="text-sm">Enter OTP</label>
                  <div className="flex gap-2 mt-1">
                    <input autoFocus className="input-fiverr flex-1" value={otp} onChange={(e) => setOtp(e.target.value)} aria-label="OTP code" />
                    <button type="button" onClick={verifyOtp} className="btn-primary" disabled={verifying} aria-disabled={verifying}>{verifying ? 'Verifying...' : 'Verify'}</button>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <div className="text-rose-600">{otpError}</div>
                    <div className="text-hope-gray-500">Expires in: {otpCountdown > 0 ? formatCountdown(otpCountdown) : '00:00'}</div>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="w-full btn-primary py-3 text-base" disabled={!emailVerified}>
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-hope-gray-600 dark:text-hope-gray-400">
              Already have an account?{' '}
              <a href="#/login" className="text-primary hover:text-hope-green-dark font-semibold transition-colors">
                Sign in
              </a>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-hope-gray-200 dark:border-hope-gray-700 text-center">
            <p className="text-xs text-hope-gray-500 dark:text-hope-gray-500">
              By continuing, you agree to NewRoots' Terms of Service and Privacy Policy
            </p>
            <div className="mt-3">
              <div ref={googleButtonRef} style={{ display: 'inline-block' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
