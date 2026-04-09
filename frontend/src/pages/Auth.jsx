import { useState } from 'react';
import { Sun, Moon, Shield, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, signup } from '../utils/api';
import { cn } from '../utils/cn';

export default function Auth({ setUser, addToast, theme, toggleTheme }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(form.email, form.password);
        if (res.success) { addToast(`Welcome back, ${res.user.name}!`, 'success'); setUser(res.user); }
        else addToast(res.message || 'Login failed', 'error');
      } else {
        if (!form.name.trim()) return addToast('Please enter your name', 'error');
        const res = await signup(form.name, form.email, form.password, form.role);
        if (res.success) { addToast(`Account created! Welcome, ${res.user.name}!`, 'success'); setUser(res.user); }
        else addToast(res.message || 'Signup failed', 'error');
      }
    } catch {
      addToast('Cannot connect to server. Ensure backend is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200/50 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all backdrop-blur-sm";
  const labelCls = "block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-1";

  // Animation variants
  const fadeIn = { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 100, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-1/2 -left-1/4 w-[150%] h-[150%] bg-[conic-gradient(from_0deg_at_50%_50%,rgba(20,184,166,0.1),rgba(139,92,246,0.1),rgba(20,184,166,0.1))] blur-3xl opacity-60 dark:opacity-40" />
      </div>

      {/* Theme toggle */}
      <button onClick={toggleTheme} className="fixed top-6 right-6 p-2.5 rounded-2xl glass-card text-slate-500 dark:text-slate-300 hover:text-primary-600 transition-colors shadow-lg z-50 focus:ring-2 ring-primary-500/20">
        {theme === 'dark' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5 text-indigo-500" />}
      </button>

      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
        className="w-full max-w-[1000px] flex rounded-[2rem] glass-card overflow-hidden shadow-2xl shadow-primary-900/5 dark:shadow-black/40 border border-white/40 dark:border-slate-800/60 min-h-[600px]">
        
        {/* Left: Branding Panel (Hidden on small screens) */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary-600/90 to-accent-600/90 text-white p-12 flex-col justify-between relative overflow-hidden backdrop-blur-md">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 MixBlendMode-overlay mix-blend-overlay"></div>
          
          <motion.div variants={fadeIn} className="relative z-10 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl shadow-xl border border-white/20">T</div>
            <span className="text-2xl font-black tracking-tight drop-shadow-md">TrustPay</span>
          </motion.div>

          <motion.div variants={fadeIn} className="relative z-10">
            <Shield className="w-16 h-16 text-primary-200 mb-6 drop-shadow-lg" />
            <h1 className="text-4xl font-black mb-4 leading-tight">Secure.<br/>Transparent.<br/>Reliable.</h1>
            <p className="text-primary-100 text-lg max-w-sm font-medium">
              India's premier payment verification layer for safe and smart transactions.
            </p>
          </motion.div>

          <div className="relative z-10 flex items-center gap-2 text-sm font-semibold text-primary-200 bg-white/10 w-max px-4 py-2 rounded-full border border-white/10 shadow-inner">
            <Sparkles className="w-4 h-4" /> Ready for the future
          </div>
        </div>

        {/* Right: Auth Form Panel */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white/40 dark:bg-slate-900/40 relative">
          
          {/* Mobile Logo */}
          <motion.div variants={fadeIn} className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center text-white font-black text-2xl shadow-lg mb-3">T</div>
            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">TrustPay</h2>
          </motion.div>

          <motion.div variants={fadeIn} className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-accent-600 dark:from-primary-400 dark:to-accent-400">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2 mb-6">
              {isLogin ? 'Select your portal to securely access the dashboard.' : 'Join the trusted payment network today.'}
            </p>

            {/* Portal Toggle Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-inner">
              <button 
                type="button" 
                onClick={() => { set('role', 'user'); if(isLogin) { set('email', 'keshavdharla@gmail.com'); set('password', 'password123'); } }} 
                className={cn("flex-1 py-2.5 text-sm font-black tracking-wide rounded-lg transition-all", form.role === 'user' ? "bg-white dark:bg-slate-900 shadow-md text-primary-600 dark:text-primary-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                Customer Portal
              </button>
              <button 
                type="button" 
                onClick={() => { set('role', 'merchant'); if(isLogin) { set('email', 'merchant@trustpay.tech'); set('password', 'merchant123'); } }} 
                className={cn("flex-1 py-2.5 text-sm font-black tracking-wide rounded-lg transition-all", form.role === 'merchant' ? "bg-white dark:bg-slate-900 shadow-md text-accent-600 dark:text-accent-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300")}>
                Merchant Portal
              </button>
            </div>
            {isLogin && <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-3 flex items-center justify-center gap-1.5"><Shield className="w-3 h-3" /> Auto-fills credentials</p>}
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className={labelCls}>Full Name</label>
                  <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="e.g. Rahul Sharma" />
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div variants={fadeIn}>
              <label className={labelCls}>Email Address</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="rahul@example.com" />
            </motion.div>

            <motion.div variants={fadeIn}>
              <label className={labelCls}>Password</label>
              <input type="password" required value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} placeholder="••••••••" />
            </motion.div>

            <AnimatePresence mode="popLayout">
               {/* Role toggle was moved to the top. This block is clean. */}
            </AnimatePresence>

            <motion.button variants={fadeIn} type="submit" disabled={loading}
              className="w-full mt-6 py-3.5 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-primary-500/25 transition-all active:scale-[0.98]">
              {loading ? 'Please wait...' : isLogin ? 'Sign In Securely' : 'Create Account'}
            </motion.button>
          </form>

          <motion.div variants={fadeIn} className="mt-8 text-center">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary-600 dark:text-primary-400 hover:underline">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
