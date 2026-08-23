import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Auth from './pages/Auth';
import MerchantMode from './pages/MerchantMode';
import UserMode from './pages/UserMode';
import SafeMode from './pages/SafeMode';
import Analytics from './pages/Analytics';
import FamilyPortal from './pages/FamilyPortal';
import Blog from './pages/Blog';
import Footer from './components/Footer';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import HelpCenter from './pages/HelpCenter';
import SecurityCenter from './pages/SecurityCenter';
import FraudProtectionCenter from './pages/FraudProtectionCenter';
import TransactionDetails from './pages/TransactionDetails';

export default function App() {
  const [toasts, setToasts] = useState([]);

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('trustpay_user')); }
    catch { return null; }
  });

  const [theme, setTheme] = useState(
    () => localStorage.getItem('trustpay_theme') || 'dark'
  );

  useEffect(() => {
    const root = document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('trustpay_theme', theme);
  }, [theme]);

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
      <div className="flex flex-col min-h-screen bg-[#F2F1F0] dark:bg-[#111] relative overflow-hidden transition-colors duration-500 font-sans">
        
        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Routes>
            {/* /family is a public route — no login needed */}
            <Route path="/family" element={<FamilyPortal />} />

            {/* All other routes require auth */}
            <Route
              path="*"
              element={
                !user ? (
                  <Auth
                    setUser={setUser}
                    addToast={addToast}
                    theme={theme}
                    toggleTheme={toggleTheme}
                  />
                ) : (
                  <>
                    <Navbar user={user} logout={logout} theme={theme} toggleTheme={toggleTheme} />
                    <main className="flex-1 pt-20 pb-16">
                      <Routes>
                        <Route path="/blog"       element={<Blog />} />
                        <Route path="/privacy"    element={<Privacy />} />
                        <Route path="/terms"      element={<Terms />} />
                        <Route path="/help"       element={<HelpCenter />} />
                        <Route path="/security"   element={<SecurityCenter />} />
                        <Route path="/fraud"      element={<FraudProtectionCenter addToast={addToast} />} />
                        <Route path="/transaction/:txnId" element={<TransactionDetails />} />
                        
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
                    <Footer />
                  </>
                )
              }
            />
          </Routes>
        </div>

      </div>

      <Toast toasts={toasts} removeToast={(id) => setToasts(p => p.filter(t => t.id !== id))} />
    </BrowserRouter>
  );
}
