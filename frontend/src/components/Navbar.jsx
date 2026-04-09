import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Shield, FileText, LogOut, Sun, Moon, Menu, X, ShieldCheck, BookOpen } from 'lucide-react';
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
    ] : []),
    { to: '/blog',       label: 'Blog',       Icon: BookOpen }
  ];

  const baseLink = 'relative flex items-center gap-2 text-sm font-semibold px-2 py-1.5 rounded-lg transition-all overflow-hidden group';
  const activeLink   = 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/10';
  const inactiveLink = 'text-slate-500 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 glass border-b-0">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-6">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary-500/30">T</div>
          <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">TrustPay</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-2 h-full py-3">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
              cn(baseLink, isActive ? activeLink : inactiveLink)}>
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-primary-500" : "")} />
                  <span>{label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary-400 to-primary-600 rounded-t-md" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-xl text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:ring-2 focus:ring-primary-500/20">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User badge */}
          <div className="hidden sm:block text-right border-l border-slate-200 dark:border-slate-700 pl-3">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{user.name}</p>
            <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 capitalize">{user.role}</p>
          </div>

          {/* Logout */}
          <button onClick={logout} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-500 dark:text-slate-300 hover:text-danger dark:hover:text-danger hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden absolute top-16 inset-x-0 glass-card border-x-0 border-t-0 border-b border-slate-200/50 dark:border-slate-700/50 shadow-xl px-4 py-3 flex flex-col gap-1">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              )}>
              <Icon className={cn("w-4 h-4", isActive ? "text-primary-500" : "")} />
              {label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
