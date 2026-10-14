import { NavLink } from 'react-router-dom';
/* eslint-disable react/prop-types */
import { LayoutDashboard, BarChart3, Shield, LogOut, Sun, Moon, Menu, X, ShieldCheck, BookOpen, Lock, QrCode, ClipboardList, Users, Bell, Type } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

export default function Navbar({ user, logout, theme, toggleTheme, simpleMode, toggleSimpleMode }) {
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const isMerchant = user.role === 'merchant';
  const isGuardian = user.role === 'guardian';

  // Desktop Navbar Links
  const links = isMerchant ? [
      { to: '/', label: 'Home', Icon: LayoutDashboard },
      { to: '/analytics', label: 'Merchant Insights', Icon: BarChart3 },
      { to: '/merchant/qr', label: 'My QR', Icon: QrCode },
      { to: '/fraud', label: 'Fraud Center', Icon: ShieldCheck },
      { to: '/security', label: 'Security Center', Icon: Lock },
      { to: '/blog', label: 'About', Icon: BookOpen },
    ] : isGuardian ? [
      { to: '/guardian/dashboard', label: 'Guardian Dashboard', Icon: LayoutDashboard },
      { to: '/guardian/protected-users', label: 'Protected Users', Icon: Users },
      { to: '/guardian/alerts', label: 'Alerts', Icon: Bell },
      { to: '/guardian/about', label: 'About', Icon: BookOpen },
    ] : [
      { to: '/user', label: 'Safety Hub', Icon: ShieldCheck },
      { to: '/user/dashboard', label: 'My Checks', Icon: ClipboardList },
      { to: '/user/guardian', label: 'Guardian Requests', Icon: Shield },
      { to: '/blog', label: 'About', Icon: BookOpen },
    ];

  const baseLink = 'relative flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg transition-all overflow-hidden group';
  const activeLink   = 'text-[#15BCDF] dark:text-[#15BCDF] bg-[#15BCDF]/10';
  const inactiveLink = 'text-[#3a3a3a] dark:text-slate-300 hover:text-[#15BCDF] dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/40';

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-[#F2F1F0]/90 dark:bg-[#111]/90 backdrop-blur-xl border-b border-slate-300 dark:border-white/10 shadow-sm font-sans" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between gap-2 sm:gap-6">

        {/* Logo */}
        <NavLink to="/" className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer">
          <img src="/guardx-icon.svg" alt="GuardX" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shadow-md object-contain" />
          <span className="text-sm font-bold tracking-wider uppercase text-[#2b3033] dark:text-white">guardx<span className="text-[#15BCDF]">.</span></span>
        </NavLink>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-2 h-full py-3">
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) =>
              cn(baseLink, isActive ? activeLink : inactiveLink)}>
              {({ isActive }) => (
                <>
                  <Icon className={cn("w-4 h-4 transition-colors", isActive ? "text-[#15BCDF]" : "")} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Simple mode toggle */}
          <button onClick={toggleSimpleMode} className={`p-2 rounded-lg transition-colors hidden sm:block ${simpleMode ? 'bg-[#15BCDF]/20 text-[#15BCDF]' : 'text-slate-500 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800'}`} title="Toggle Simple Mode">
            <Type className="w-5 h-5" />
          </button>

          {/* Theme toggle */}
          <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-500 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* User badge */}
          <div className="hidden sm:block text-right border-l border-slate-300 dark:border-slate-800 pl-3">
            <p className="text-xs font-bold text-[#2b3033] dark:text-slate-100 leading-tight">{user.name}</p>
            <p className="text-[9px] font-bold text-[#15BCDF] uppercase tracking-widest capitalize">{user.role}</p>
          </div>

          {/* Logout */}
          <button onClick={logout} className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-300">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-[#F2F1F0] dark:bg-[#1a1c1e] border-b border-slate-300 dark:border-slate-800 shadow-xl px-4 py-3 flex flex-col gap-1 z-[110] max-h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="sm:hidden px-3 py-2 mb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#2b3033] dark:text-slate-100">{user.name}</p>
              <p className="text-[9px] font-bold text-[#15BCDF] uppercase tracking-widest">{user.role}</p>
            </div>
            <button onClick={toggleSimpleMode} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 dark:text-slate-350 bg-slate-200/60 dark:bg-slate-800/60">
              <Type className="w-4 h-4" />
              <span>Simple Mode</span>
            </button>
          </div>
          {links.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all',
                isActive
                  ? 'bg-[#15BCDF]/10 text-[#15BCDF]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800/50'
              )}>
              {({ isActive }) => <><Icon className={cn("w-4 h-4", isActive ? "text-[#15BCDF]" : "")} />{label}</>}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
