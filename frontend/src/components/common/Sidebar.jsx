import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Wallet, 
  Truck, 
  FileSpreadsheet, 
  BarChart3, 
  LogOut, 
  Menu,
  X,
  Sun,
  Moon,
  Key,
  Settings
} from 'lucide-react';

export const Sidebar = ({
  currentTab,
  setCurrentTab,
  user,
  onLogout,
  onChangePassword,
  isOpen,
  setIsOpen,
  theme,
  toggleTheme,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendors', label: 'Vendor Management', icon: Users },
    { id: 'pos', label: 'Purchase Orders', icon: FileText },
    { id: 'payments', label: 'Payments', icon: Wallet },
    { id: 'deliveries', label: 'Deliveries', icon: Truck },
    { id: 'statements', label: 'Vendor Statement', icon: FileSpreadsheet },
    { id: 'reports', label: 'Spend & Reports', icon: BarChart3 },
  ];

  const handleSelect = (id) => {
    setCurrentTab(id);
    setIsOpen(false); // Close mobile drawer
  };

  return (
    <>
      {/* Mobile Toggle Button Header */}
      <header className="lg:hidden h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <img
            src="/android-chrome-192x192.png"
            alt="Paper Plane Logo"
            className="h-9 w-9 rounded-xl shadow-sm object-cover border border-gray-100 dark:border-gray-800"
            referrerPolicy="no-referrer"
          />
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none block">Paper Plane</span>
            <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 leading-none">PO & PAYMENTS</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-650 dark:text-gray-400 transition-colors focus:outline-none"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-gray-900/30 dark:bg-black/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Frame */}
      <aside
        className={`fixed inset-y-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-64 z-50 transform lg:transform-none transition-transform duration-300 flex flex-col justify-between select-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isOpen ? 'top-16 lg:top-0' : 'top-0'}
        `}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="hidden lg:flex items-center gap-3 px-6 h-20 border-b border-gray-100 dark:border-gray-800">
            <img
              src="/android-chrome-192x192.png"
              alt="Paper Plane Logo"
              className="h-10 w-10 rounded-xl shadow-md object-cover border border-gray-150 dark:border-gray-800"
              referrerPolicy="no-referrer"
            />
            <div>
              <span className="font-semibold text-gray-950 dark:text-gray-50 block leading-tight tracking-tight">Paper Plane</span>
              <span className="text-[10px] font-mono tracking-wider text-gray-400 dark:text-gray-500 uppercase leading-none block">Procurement SaaS</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950 shadow-sm shadow-gray-950/10' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }
                  `}
                >
                  <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105
                    ${isActive ? 'text-white dark:text-gray-950' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-650 dark:group-hover:text-gray-300'}
                  `} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer Account details */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-3 bg-gray-50/50 dark:bg-gray-950/40">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full flex items-center justify-center font-bold text-sm">
              {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-950 dark:text-gray-100 truncate leading-none">
                {user?.username || 'admin'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {user?.email || 'edharanagasaimanohar@gmail.com'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onChangePassword}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors rounded-lg cursor-pointer select-none"
          >
            <Settings className="h-3.5 w-3.5 text-indigo-500" />
            <span>Admin Settings</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors rounded-lg cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </span>
            <span className="text-[10px] bg-rose-200/50 dark:bg-rose-950/50 px-1.5 py-0.5 rounded leading-none text-rose-700 dark:text-rose-300">ESC</span>
          </button>
        </div>
      </aside>
    </>
  );
};
