import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar    from './components/Navbar';
import Toast     from './components/Toast';
import Auth      from './pages/Auth';
import MerchantMode  from './pages/MerchantMode';
import UserMode      from './pages/UserMode';
import SafeMode      from './pages/SafeMode';
import Analytics     from './pages/Analytics';
import FamilyPortal  from './pages/FamilyPortal';

export default function App() {
  const [toasts, setToasts] = useState([]);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trustpay_user')); } catch { return null; }
  });

  // Default to dark mode on first load
  const [theme, setTheme] = useState(() => localStorage.getItem('trustpay_theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('trustpay_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) localStorage.setItem('trustpay_user', JSON.stringify(user));
    else      localStorage.removeItem('trustpay_user');
  }, [user]);

  const addToast = (message, type = 'info') => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => removeToast(id), 4500);
  };
  const removeToast = (id) => setToasts(p => p.filter(t => t.id !== id));

  const logout = () => { setUser(null); addToast('Logged out successfully', 'info'); };

  if (!user) {
    return (
      <div className="min-h-screen bg-cream-200 dark:bg-brown-600">
        <Auth setUser={setUser} addToast={addToast} theme={theme} toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        <Toast toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  // /family portal is accessible WITHOUT login (family member's device)
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/family" element={<FamilyPortal />} />
        <Route path="*" element={<AuthenticatedApp user={user} setUser={setUser} addToast={addToast} removeToast={removeToast} toasts={toasts} logout={logout} theme={theme} setTheme={setTheme} />} />
      </Routes>
    </BrowserRouter>
  );
}

function AuthenticatedApp({ user, setUser, addToast, removeToast, toasts, logout, theme, setTheme }) {
  if (!user) {
    return (
      <div className="min-h-screen bg-cream-200 dark:bg-brown-600">
        <Auth setUser={setUser} addToast={addToast} theme={theme} toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        <Toast toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }
  return (
      <div className="flex flex-col min-h-screen bg-cream-200 dark:bg-brown-600">
        <Navbar user={user} logout={logout} theme={theme} toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        <main className="flex-1 pt-16 pb-16 md:pb-0">
          <Routes>
            {user.role === 'merchant' ? (
              <>
                <Route path="/"          element={<MerchantMode addToast={addToast} />} />
                <Route path="/analytics" element={<Analytics addToast={addToast} />} />
                <Route path="*"          element={<Navigate to="/" />} />
              </>
            ) : (
              <>
                <Route path="/"        element={<UserMode addToast={addToast} user={user} />} />
                <Route path="/safe"    element={<SafeMode addToast={addToast} user={user} />} />
                <Route path="/reports" element={<Analytics addToast={addToast} readOnly />} />
                <Route path="*"        element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </main>
      </div>
      <Toast toasts={toasts} removeToast={removeToast} />
  );
}

