import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Shield, FileText, LogOut, Sun, Moon, Menu, X, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

export default function Navbar({ user, logout, theme, toggleTheme }) {
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const isMerchant = user.role === 'merchant';

  // Safe Mode: only for users
  const links = [
    { to: '/',           label: 'Dashboard',  Icon: LayoutDashboard },
    ...(isMerchant ? [{ to: '/analytics', label: 'Analytics', Icon: BarChart3 }] : []),
    ...(!isMerchant ? [
      { to: '/safe',    label: 'Safe Mode',  Icon: Shield },
      { to: '/reports', label: 'Reports',    Icon: FileText },
    ] : []),
  ];

  const baseLink = 'flex items-center gap-2 text-sm font-semibold px-1 py-1 border-b-2 transition-colors';
  const activeLink   = 'text-slate-500 dark:text-slate-300 border-cyan-200 dark:border-slate-200';
  const inactiveLink = 'text-slate-500 dark:text-slate-300 border-transparent hover:text-cyan-600 dark:hover:text-white';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-cyan-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-white font-black shadow">T</div>
          <span className="text-lg font-black text-cyan-600 dark:text-slate-100 tracking-tight">TrustPay</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 h-full">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
              cn(baseLink, isActive ? activeLink : inactiveLink)}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-cyan-500 transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User badge */}
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-cyan-600 dark:text-slate-100 leading-tight">{user.name}</p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 capitalize">{user.role}</p>
          </div>

          {/* Logout */}
          <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-slate-500 dark:text-slate-200 hover:text-danger dark:hover:text-danger hover:bg-slate-100 dark:hover:bg-cyan-500 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-cyan-500 text-slate-500 dark:text-slate-200">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-cyan-200 shadow-lg px-4 py-3 flex flex-col gap-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-slate-100 dark:bg-cyan-500 text-cyan-600 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-cyan-500'
              )}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
