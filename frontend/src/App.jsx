import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar       from './components/Navbar';
import Toast        from './components/Toast';
import Auth         from './pages/Auth';
import MerchantMode from './pages/MerchantMode';
import UserMode     from './pages/UserMode';
import SafeMode     from './pages/SafeMode';
import Analytics    from './pages/Analytics';
import FamilyPortal from './pages/FamilyPortal';

export default function App() {
  const [toasts, setToasts] = useState([]);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trustpay_user')); }
    catch { return null; }
  });

  // Default to dark on first load
  const [theme, setTheme] = useState(
    () => localStorage.getItem('trustpay_theme') || 'dark'
  );

  // Apply dark class to <html>
  useEffect(() => {
    const root = document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('trustpay_theme', theme);
  }, [theme]);

  // Persist user session
  useEffect(() => {
    if (user) localStorage.setItem('trustpay_user', JSON.stringify(user));
    else      localStorage.removeItem('trustpay_user');
  }, [user]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const logout      = () => { setUser(null); addToast('Logged out successfully', 'info'); };

  const addToast = (message, type = 'info') => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  };

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">

        {/* /family is a public route — no login needed */}
        <Routes>
          <Route path="/family" element={<FamilyPortal />} />

          {/* All other routes require auth */}
          <Route
            path="*"
            element={
              !user ? (
                // Not logged in → show auth screen
                <Auth
                  setUser={setUser}
                  addToast={addToast}
                  theme={theme}
                  toggleTheme={toggleTheme}
                />
              ) : (
                // Logged in → show role-based app
                <>
                  <Navbar user={user} logout={logout} theme={theme} toggleTheme={toggleTheme} />
                  <main className="flex-1 pt-16 pb-16 md:pb-0">
                    <Routes>
                      {user.role === 'merchant' ? (
                        <>
                          <Route path="/"          element={<MerchantMode addToast={addToast} />} />
                          <Route path="/analytics" element={<Analytics addToast={addToast} />} />
                          <Route path="*"          element={<Navigate to="/" replace />} />
                        </>
                      ) : (
                        <>
                          <Route path="/"        element={<UserMode addToast={addToast} user={user} />} />
                          <Route path="/safe"    element={<SafeMode addToast={addToast} user={user} />} />
                          <Route path="*"        element={<Navigate to="/" replace />} />
                        </>
                      )}
                    </Routes>
                  </main>
                </>
              )
            }
          />
        </Routes>

      </div>

      {/* Toast is always rendered outside routes so it works everywhere */}
      <Toast toasts={toasts} removeToast={(id) => setToasts(p => p.filter(t => t.id !== id))} />
    </BrowserRouter>
  );
}
