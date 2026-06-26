import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ShieldCheck, 
  MailQuestion, 
  ArrowRight, 
  User, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Award,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api';

export const Login = ({ onLoginSuccess, addToast }) => {
  // Mode switcher: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState('login');

  // Common Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Register Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user'); // admin or user

  // Forgot / Reset Fields
  const [resetToken, setResetToken] = useState('');
  const [sandboxCode, setSandboxCode] = useState('');

  // Password visibility triggers
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time password strength validation
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-gray-200' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
    if (score <= 4) return { score, label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-500' };
    return { score, label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const registerPasswordAnalysis = getPasswordStrength(password);

  const resetFields = () => {
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setSandboxCode('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      addToast(`Welcome back, ${user.username}!`, 'success');
      onLoginSuccess(token, user);
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify credentials.');
      addToast('Sign-In failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !username || !password || !confirmPassword) {
      setError('Please fill out all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const strength = getPasswordStrength(password);
    if (strength.score < 5) {
      setError('Please create a more secure password using uppercase, lowercase, numbers, and symbols.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', { 
        fullName, 
        email, 
        username, 
        password, 
        role 
      });
      
      addToast('Registration successful! Please log in.', 'success');
      setSuccess('Account created successfully! You can now log in.');
      // Pre-fill email for login
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Username or email may already be registered.');
      addToast('Register failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered email address.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/backend/config' ? '/auth/forgot-password' : '/auth/forgot-password', { email });
      const { sandboxCode } = response.data;
      
      setSandboxCode(sandboxCode || '');
      setSuccess('Reset code generated. For demo purposes, we have rendered the recovery code directly below!');
      addToast('Verification code generated.', 'success');
      
      // Auto transition to reset mode
      setTimeout(() => {
        setMode('reset');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'No account associated with this email address.');
      addToast('User not found.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email || !resetToken || !password || !confirmPassword) {
      setError('Please complete all requested verification inputs.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const strength = getPasswordStrength(password);
    if (strength.score < 5) {
      setError('Please choose a stronger password matching enterprise regulations.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password', { 
        email, 
        token: resetToken, 
        newPassword: password 
      });

      addToast(response.data.message || 'Password successfully updated!', 'success');
      setSuccess('Password updated! Redirecting to login...');
      setTimeout(() => {
        setMode('login');
        resetFields();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid recovery code, expired, or wrong email address.');
      addToast('Reset failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-gray-950 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Paper Plane Branding */}
        <div className="flex justify-center select-none">
          <img
            src="/android-chrome-192x192.png"
            alt="Paper Plane Logo"
            className="h-16 w-16 rounded-2xl shadow-xl shadow-gray-950/10 object-cover border border-gray-100 dark:border-gray-800"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 tracking-tight leading-none">
          Paper Plane Procurement
        </h2>
        <p className="mt-2 text-center text-xs text-gray-500 font-mono uppercase tracking-wider">
          Enterprise Sourcing Hub
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-gray-100 sm:px-10">
          
          {/* Header context switch title */}
          <div className="mb-6 flex justify-between items-center border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-gray-900">
              {mode === 'login' && 'Sign In'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Account Recovery'}
              {mode === 'reset' && 'Define Password'}
            </h3>
            {mode !== 'login' && (
              <button 
                onClick={() => { setMode('login'); resetFields(); }}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Sign In Gateway
              </button>
            )}
          </div>

          {error && (
            <div className="mb-5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 bg-emerald-50 border border-emerald-150 text-emerald-800 rounded-xl p-3 text-xs flex items-start gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 leading-none">
                  Email Address
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                     <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-semibold text-gray-700 leading-none">
                    Password
                  </label>
                  <button 
                    type="button"
                    onClick={() => { setMode('forgot'); resetFields(); }}
                    className="text-[11px] font-semibold text-indigo-600 hover:indigo-800 hover:underline transition-all"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 transition-colors cursor-pointer select-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-gray-900 focus:ring-gray-950 border-gray-300 rounded"
                    defaultChecked
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-600 select-none">
                    Remember my session
                  </label>
                </div>

                <div className="text-xs">
                  <span className="font-semibold text-gray-900 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> SSL Active
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gray-950 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-950 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Verifying Credentials...' : 'Sign In'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>

              <div className="mt-4 pt-4 border-t border-gray-100 text-center text-xs">
                <span className="text-gray-500">New around here?</span>{' '}
                <button 
                  type="button"
                  onClick={() => { setMode('register'); resetFields(); }}
                  className="font-semibold text-indigo-600 hover:text-indigo-800 transition-all cursor-pointer"
                >
                  Create Partner Account
                </button>
              </div>
            </form>
          )}

          {/* 2. REGISTER MODE */}
          {mode === 'register' && (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Full Business Name
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                     <Award className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 leading-none">
                    Username
                  </label>
                  <div className="mt-1.5 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                       <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full pl-9 pr-2 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-xs"
                      placeholder="e.g. jdoe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 leading-none">
                    Access Role Type
                  </label>
                  <div className="mt-1.5">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="block w-full py-2 px-3 border border-gray-300 rounded-xl text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-xs"
                    >
                      <option value="user">User (Reviewer)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Email Address
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                     <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm"
                    placeholder="e.g. john@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Secure Password
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm"
                    placeholder="At least 8 uppercase/special"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 transition-colors cursor-pointer select-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Dynamic Display */}
                {password && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 flex flex-col gap-1 text-[11px] select-none text-gray-500">
                    <div className="flex justify-between items-center">
                      <span>Password strength:</span>
                      <strong className={registerPasswordAnalysis.text}>{registerPasswordAnalysis.label}</strong>
                    </div>
                    <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${registerPasswordAnalysis.color} transition-all duration-300`} 
                        style={{ width: `${(registerPasswordAnalysis.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                      Reqs: {password.length >= 8 ? '✓' : '✗'} 8+ chars • {/[A-Z]/.test(password) ? '✓' : '✗'} uppercase • {/[0-9]/.test(password) ? '✓' : '✗'} number • {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '✗'} symbol
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Confirm Password
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm"
                    placeholder="Repeated securely"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 transition-colors cursor-pointer select-none"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gray-950 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-950 disabled:opacity-50 transition-all cursor-pointer mt-2"
              >
                {loading ? 'Creating Account...' : 'Submit Registration'}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD MODE */}
          {mode === 'forgot' && (
            <form className="space-y-5" onSubmit={handleForgot}>
              <p className="text-xs text-gray-500 leading-normal mb-1">
                Enter your registered email below. We will request a multi-factor recovery code from our security vaults.
              </p>

              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-700 leading-none">
                  Account Email Address
                </label>
                <div className="mt-2 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                     <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gray-950 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-950 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? 'Sending Code...' : 'Request Recovery Code'}
              </button>
            </form>
          )}

          {/* 4. RESET PASSWORD MODE */}
          {mode === 'reset' && (
            <form className="space-y-4" onSubmit={handleReset}>
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl mb-4 text-xs">
                <strong>Sandbox Delivery Simulator Notice</strong>
                <p className="text-[11px] text-amber-800 leading-normal mt-0.5">
                  An activation code was just logged inside our container sandbox database. 
                </p>
                {sandboxCode && (
                  <div className="mt-2 p-1 px-2.5 bg-amber-100 rounded border border-amber-200 font-mono text-center tracking-widest text-[13px] font-bold">
                    Code: {sandboxCode}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-950 text-sm mt-1.5"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-950 text-sm mt-1.5 font-mono text-center tracking-widest font-bold bg-gray-50"
                  placeholder="e.g. 123456"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Create New Password
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-950 text-sm"
                    placeholder="At least 8 uppercase/number"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 transition-colors cursor-pointer select-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 leading-none">
                  Confirm Password
                </label>
                <div className="mt-1.5 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-950 text-sm"
                    placeholder="Repeated securely"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-650 transition-colors cursor-pointer select-none"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-gray-950 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-950 disabled:opacity-50 transition-all cursor-pointer mt-2"
              >
                {loading ? 'Setting Password...' : 'Save New Credentials'}
              </button>
            </form>
          )}



        </div>
      </div>
    </div>
  );
};
