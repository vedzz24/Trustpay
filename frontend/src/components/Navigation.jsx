import { NavLink } from 'react-router-dom';
import { LayoutDashboard, UserCircle, Shield, BarChart3, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export default function Navigation({ theme, toggleTheme }) {
  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Merchant" },
    { to: "/user", icon: UserCircle, label: "User" },
    { to: "/safe", icon: Shield, label: "Safe Mode" },
    { to: "/analytics", icon: BarChart3, label: "Analytics" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t dark:border-white/10 sm:relative sm:border-t-0 sm:border-r w-full sm:w-64 sm:h-screen z-50">
      <div className="flex sm:flex-col h-full bg-white/40 dark:bg-[#0a0a0f]/80">
        
        {/* Logo & Toggle */}
        <div className="hidden sm:flex items-center justify-between p-6 border-b dark:border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyber-cyan to-cyber-purple flex items-center justify-center text-white font-black shadow-glow-cyan">
              T
            </div>
            <span className="text-xl font-bold neon-text tracking-wider">
              TrustPay
            </span>
          </div>
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 transition-colors relative group"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-cyber-cyan drop-shadow-[0_0_8px_rgba(0,245,255,0.8)]" />
            ) : (
              <Moon className="w-5 h-5 text-cyber-purple drop-shadow-[0_0_8px_rgba(107,0,255,0.8)]" />
            )}
            <span className="absolute inset-0 rounded-full box-shadow-glow-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Mobile Header (Shows Logo and Toggle) */}
        <div className="sm:hidden absolute -top-14 left-0 right-0 px-4 py-2 flex items-center justify-between glass-panel rounded-t-2xl shadow-[0_-10px_30px_rgba(0,245,255,0.1)]">
          <span className="text-lg font-black neon-text">TrustPay</span>
          <button onClick={toggleTheme} className="p-2">
            {theme === 'dark' ? <Sun className="w-5 h-5 text-cyber-cyan" /> : <Moon className="w-5 h-5 text-cyber-purple" />}
          </button>
        </div>
        
        {/* Nav Links */}
        <div className="flex sm:flex-col w-full sm:p-4 gap-1 sm:gap-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                "group relative flex items-center justify-center sm:justify-start gap-3 flex-1 sm:flex-none p-3 sm:px-4 sm:py-3 rounded-none sm:rounded-xl text-sm font-medium transition-all duration-300",
                isActive 
                  ? "text-slate-900 dark:text-white" 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-gradient-to-r from-cyber-cyan/20 to-cyber-purple/20 sm:border-l-4 border-t-2 sm:border-t-0 border-cyber-cyan shadow-[inset_4px_0_15px_rgba(0,245,255,0.1)] z-0 rounded-xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon className={cn("w-5 h-5 z-10 transition-colors", isActive ? "text-cyber-cyan drop-shadow-[0_0_5px_rgba(0,245,255,0.8)]" : "")} />
                  <span className={cn("text-xs sm:text-sm font-bold z-10", isActive ? "neon-text tracking-wide" : "")}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
