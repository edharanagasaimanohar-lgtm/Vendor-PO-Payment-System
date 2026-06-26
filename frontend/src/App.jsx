import { useState, useEffect } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/Toast';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Vendors } from './pages/Vendors';
import { PurchaseOrders } from './pages/PurchaseOrders';
import { Payments } from './pages/Payments';
import { Deliveries } from './pages/Deliveries';
import { VendorStatement } from './pages/VendorStatement';
import { Reports } from './pages/Reports';
import { motion, AnimatePresence } from 'motion/react';
import { PackageOpen, Sparkles, UserCheck2, RefreshCw, Sun, Moon, Key, Lock, X, User, Settings, Eye, EyeOff } from 'lucide-react';
import { api } from './services/api';

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [sessionResolving, setSessionResolving] = useState(true);

  // Change password states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Admin Settings states
  const [activeSettingsTab, setActiveSettingsTab] = useState('profile'); // 'profile' | 'password' | 'appearance'
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    if (user) {
      setNewUsername(user.username || '');
    }
  }, [user]);

  const handleUpdateUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setModalError('Username cannot be empty.');
      return;
    }
    setModalError('');
    setModalLoading(true);
    try {
      const response = await api.post('/auth/update-profile', { username: newUsername });
      const updatedUser = response.data.user;
      const updatedToken = response.data.token;
      
      setUser(updatedUser);
      localStorage.setItem('paperplane_user_data', JSON.stringify(updatedUser));
      if (updatedToken) {
        localStorage.setItem('paperplane_jwt_token', updatedToken);
      }
      addToast('Username successfully updated to ' + updatedUser.username + '!', 'success');
      setModalError('');
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to update username.');
      addToast('Profile update failed.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const getPasswordStrengthAnalysis = (pwd) => {
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

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setModalError('Please fill out all fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setModalError('New passwords do not match.');
      return;
    }
    const strength = getPasswordStrengthAnalysis(newPassword);
    if (strength.score < 5) {
      setModalError('New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and symbols.');
      return;
    }

    setModalError('');
    setModalLoading(true);

    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      addToast('Password updated successfully!', 'success');
      setShowChangePasswordModal(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to update password. Current password may be incorrect.');
      addToast('Password upgrade failed.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  // Theme support
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('paperplane_theme') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('paperplane_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Active Toast list manager
  const addToast = (text, type) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Re-verify session token from local storage
  useEffect(() => {
    const savedToken = localStorage.getItem('paperplane_jwt_token');
    const savedUser = localStorage.getItem('paperplane_user_data');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setSessionResolving(false);
  }, []);

  // Sync storage on Login success
  const handleLoginSuccess = (newToken, newUser) => {
    localStorage.setItem('paperplane_jwt_token', newToken);
    localStorage.setItem('paperplane_user_data', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setCurrentTab('dashboard');
  };

  // Logout routine on demand
  const handleLogout = () => {
    localStorage.removeItem('paperplane_jwt_token');
    localStorage.removeItem('paperplane_user_data');
    setToken(null);
    setUser(null);
    addToast('Logged out of Paper Plane admin panel.', 'info');
  };

  // Map sub-components based on active navigation index
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} addToast={addToast} />;
      case 'vendors':
        return <Vendors addToast={addToast} />;
      case 'pos':
        return <PurchaseOrders addToast={addToast} setCurrentTab={setCurrentTab} />;
      case 'payments':
        return <Payments addToast={addToast} />;
      case 'deliveries':
        return <Deliveries addToast={addToast} />;
      case 'statements':
        return <VendorStatement addToast={addToast} />;
      case 'reports':
        return <Reports addToast={addToast} />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} addToast={addToast} />;
    }
  };

  // Loading spinner during startup
  if (sessionResolving) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <div className="flex flex-col items-center gap-2 font-sans select-none">
          <RefreshCw className="animate-spin h-7 w-7 text-gray-900" />
          <h2 className="text-sm font-semibold text-gray-650 mt-1">Booting procurement dashboard...</h2>
        </div>
      </div>
    );
  }

  // Not authenticated: render Login interface gateway
  if (!token) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} addToast={addToast} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  // Authenticated Dashboard Shell Layout
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-955 flex flex-col lg:flex-row font-sans text-gray-900 dark:text-gray-100 antialiased overflow-x-hidden selection:bg-gray-900 dark:selection:bg-white dark:selection:text-gray-955 dark:selection:text-gray-950 transition-colors duration-200">
      {/* 2-Column Sidebar Frame */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        user={user}
        onLogout={handleLogout}
        onChangePassword={() => setShowChangePasswordModal(true)}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Pane */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Upper Top Navbar Header for Desktop */}
         <header className="hidden lg:flex items-center justify-between h-20 px-8 border-b border-gray-200 dark:border-gray-808 bg-white dark:bg-gray-900 sticky top-0 z-20 select-none shadow-xs transition-colors duration-200">
          <div className="flex items-center gap-2">
            <PackageOpen className="h-5 w-5 text-indigo-700 dark:text-indigo-400" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest font-mono">
              Sourcing Hub / Paper Plane Gifting
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-955 dark:text-gray-400 dark:hover:text-gray-55 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-850" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-150 dark:border-emerald-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span>LOGGED IN AS ADMIN</span>
            </span>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-850" />
            <div className="text-xs text-gray-505 dark:text-gray-400 font-mono">
              UTC: <span className="font-semibold text-gray-800 dark:text-gray-300">2026-06-15</span>
            </div>
          </div>
        </header>

        {/* Animated Inner Page view container */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="max-w-7xl mx-auto"
            >
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Humble and Clean footer credits */}
        <footer className="py-5 px-8 text-center text-[10px] text-gray-400 dark:text-gray-500 select-none border-t border-gray-150 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 print:hidden transition-colors duration-200">
          <p>© 2026 Paper Plane Gifting System. Reconciled under Ledger double-entry specifications.</p>
        </footer>
      </div>

      {/* Global Toast Notifiers display */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {/* Admin Settings Overlay Modal */}
      {showChangePasswordModal && (
        <div id="change-password-modal" className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full shadow-2xl border border-gray-150 dark:border-gray-800 relative animate-in fade-in zoom-in-95 duration-150 flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
              <div className="flex items-center gap-3 select-none">
                <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Settings className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Admin Settings</h3>
                  <span className="text-xs text-gray-400">Manage your workspace preferences</span>
                </div>
              </div>
              <button 
                id="close-pwd-modal"
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setOldPassword('');
                  setNewPassword('');
                  setConfirmNewPassword('');
                  setModalError('');
                  setActiveSettingsTab('profile');
                  setShowOldPassword(false);
                  setShowNewPassword(false);
                  setShowConfirmNewPassword(false);
                }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/25 px-4">
              <button
                type="button"
                onClick={() => { setActiveSettingsTab('profile'); setModalError(''); }}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeSettingsTab === 'profile'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-550 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                Profile & Username
              </button>
              <button
                type="button"
                onClick={() => { setActiveSettingsTab('password'); setModalError(''); }}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeSettingsTab === 'password'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-550 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-205'
                }`}
              >
                Security & Password
              </button>
              <button
                type="button"
                onClick={() => { setActiveSettingsTab('appearance'); setModalError(''); }}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  activeSettingsTab === 'appearance'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                    : 'border-transparent text-gray-550 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-205'
                }`}
              >
                Theme & Appearance
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="p-6 overflow-y-auto flex-1">
              {modalError && (
                <div className="mb-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-350 p-3 rounded-lg text-xs flex items-start gap-2">
                  <span className="font-semibold">Error:</span> {modalError}
                </div>
              )}

              {/* PROFILE TAB */}
              {activeSettingsTab === 'profile' && (
                <form onSubmit={handleUpdateUsernameSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Account Registered Email
                    </label>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-955 p-3 rounded-xl border border-gray-150 dark:border-gray-800 select-all">
                      {user?.email || 'N/A'}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block">
                      To safeguard data provenance, registered email updates must go through enterprise administrative request pipelines.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Active Username
                    </label>
                    <div className="mt-2 relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-955 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all text-sm font-semibold"
                        placeholder="Enter username"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      {modalLoading ? 'Saving changes...' : 'Save Username'}
                    </button>
                  </div>
                </form>
              )}

              {/* SECURITY / PASSWORD TAB */}
              {activeSettingsTab === 'password' && (
                <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Current Password
                    </label>
                    <div className="mt-1.5 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showOldPassword ? "text" : "password"}
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="block w-full pl-9 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-955 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer select-none"
                        title={showOldPassword ? "Hide password" : "Show password"}
                      >
                        {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      New Secure Password
                    </label>
                    <div className="mt-1.5 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full pl-9 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-955 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all text-sm"
                        placeholder="8+ chars, upper/lower/spec"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer select-none"
                        title={showNewPassword ? "Hide password" : "Show password"}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="mt-2 p-2 bg-gray-55 dark:bg-gray-955 rounded-lg border border-gray-100 dark:border-gray-805 flex flex-col gap-1 text-[11px] select-none text-gray-500">
                        <div className="flex justify-between items-center bg-transparent">
                          <span className="dark:text-gray-400">Password strength:</span>
                          <strong className={getPasswordStrengthAnalysis(newPassword).text}>{getPasswordStrengthAnalysis(newPassword).label}</strong>
                        </div>
                        <div className="h-1 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getPasswordStrengthAnalysis(newPassword).color} transition-all duration-300`} 
                            style={{ width: `${(getPasswordStrengthAnalysis(newPassword).score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Confirm New Password
                    </label>
                    <div className="mt-1.5 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showConfirmNewPassword ? "text" : "password"}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="block w-full pl-9 pr-10 py-2 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-955 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all text-sm"
                        placeholder="Verify repeated password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer select-none"
                        title={showConfirmNewPassword ? "Hide password" : "Show password"}
                      >
                        {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={modalLoading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-550 dark:hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      {modalLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}

              {/* APPEARANCE / THEME TAB */}
              {activeSettingsTab === 'appearance' && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                      Interface Palette mode
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Customize your visual atmosphere to enhance accessibility, balance eye fatigue, or reduce power consumption.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Light theme selector block */}
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== 'light') {
                            toggleTheme();
                            addToast('Switched to clean minimalist light mode.', 'info');
                          }
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/10 shadow'
                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${theme === 'light' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-550'}`}>
                          <Sun className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <span className="block text-xs font-bold text-gray-850 dark:text-gray-200">Light Slate</span>
                          <span className="text-[10px] text-gray-400">High luminance & contrast</span>
                        </div>
                      </button>

                      {/* Dark theme selector block */}
                      <button
                        type="button"
                        onClick={() => {
                          if (theme !== 'dark') {
                            toggleTheme();
                            addToast('Switched to eye-friendly dark slate mode.', 'info');
                          }
                        }}
                        className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20 shadow'
                            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${theme === 'dark' ? 'bg-indigo-950 text-indigo-400' : 'bg-gray-100 text-gray-550'}`}>
                          <Moon className="h-5 w-5" />
                        </div>
                        <div className="text-center">
                          <span className="block text-xs font-bold text-gray-850 dark:text-gray-200">Dark Cosmic</span>
                          <span className="text-[10px] text-gray-400">Low light & custom dark visual accent</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 italic block text-center">
                      Preferences are persisted inside your cloud browser local secure storage.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
