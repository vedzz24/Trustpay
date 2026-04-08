import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { login, signup } from '../utils/api';

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
      addToast('Cannot connect to server. Ensure backend is running on port 5000.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-cyan-200 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-300 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-300 transition-all";
  const labelCls = "block text-sm font-semibold text-slate-500 dark:text-slate-200 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Theme toggle */}
      <button onClick={toggleTheme} className="fixed top-4 right-4 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-cyan-200 text-slate-500 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-cyan-500 transition-colors shadow-sm">
        {theme === 'dark' ? <Sun className="w-5 h-5 text-warning" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-cyan-200 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500 flex items-center justify-center text-white font-black text-2xl shadow-lg mb-4">T</div>
            <h1 className="text-2xl font-black text-cyan-600 dark:text-slate-100">
              {isLogin ? 'Welcome back' : 'Join TrustPay'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1 text-center">
              India's trusted payment verification layer
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className={labelCls}>Full Name</label>
                <input type="text" required value={form.name} onChange={e => set('name', e.target.value)} className={inputCls} placeholder="Rahul Sharma" />
              </div>
            )}

            <div>
              <label className={labelCls}>Email Address</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="rahul@example.com" />
            </div>

            <div>
              <label className={labelCls}>Password</label>
              <input type="password" required value={form.password} onChange={e => set('password', e.target.value)} className={inputCls} placeholder="••••••••" />
            </div>

            {!isLogin && (
              <div>
                <label className={labelCls}>I am signing up as...</label>
                <div className="grid grid-cols-2 gap-3">
                  {[['user', '👤 Customer'], ['merchant', '🏪 Merchant']].map(([role, label]) => (
                    <button key={role} type="button" onClick={() => set('role', role)}
                      className={`py-3 rounded-xl font-semibold text-sm border-2 transition-all ${
                        form.role === role
                          ? 'border-cyan-200 bg-slate-100 dark:bg-cyan-500 text-cyan-600 dark:text-slate-100'
                          : 'border-slate-100 dark:border-cyan-200 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-200'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full mt-2 py-3 bg-cyan-500 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold rounded-xl shadow-md transition-all active:scale-95">
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-slate-500 dark:text-slate-300">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-slate-500 dark:text-warning hover:underline font-bold">
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="text-center mt-4 text-xs text-slate-300 dark:text-slate-500">
          Demo: Sign up with any email and password — no verification needed.
        </p>
      </div>
    </div>
  );
}
