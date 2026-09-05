import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import Auth from './pages/Auth';
import MerchantMode from './pages/MerchantMode';
import Analytics from './pages/Analytics';
import Blog from './pages/Blog';
import Footer from './components/Footer';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import HelpCenter from './pages/HelpCenter';
import SecurityCenter from './pages/SecurityCenter';
import FraudProtectionCenter from './pages/FraudProtectionCenter';
import TransactionDetails from './pages/TransactionDetails';
import MerchantQr from './pages/MerchantQr';
import CustomerPay from './pages/CustomerPay';
import { SafetyHub, QrSafetyCheck, TextSafetyCheck, PaymentProofCheck, AudioSafetyCheck, ShieldScan, SafetyAccount, SafetyDashboard } from './pages/UserSafety';
import { UserGuardianProtection, GuardianAccount, GuardianAccept, GuardianDashboard, ProtectedUsers, GuardianAlerts, GuardianAbout } from './pages/GuardianProtection';

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

  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('trustpay_token');
      localStorage.removeItem('trustpay_user');
      setUser(null);
    };
    window.addEventListener('trustpay:session-expired', handleSessionExpired);
    return () => window.removeEventListener('trustpay:session-expired', handleSessionExpired);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const logout      = () => {
    localStorage.removeItem('trustpay_token');
    setUser(null);
    addToast('Logged out successfully', 'info');
  };

  const addToast = (message, type = 'info') => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  };

  const publicSafetyPage = page => user ? <><Navbar user={user} logout={logout} theme={theme} toggleTheme={toggleTheme} /><main className="flex-1 pt-20 pb-16">{page}</main></> : page;

  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-[#F2F1F0] dark:bg-[#111] relative overflow-hidden transition-colors duration-500 font-sans">
        
        {/* Content Wrapper */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Routes>
            <Route path="/pay/:merchantId" element={<CustomerPay />} />
            <Route path="/user" element={publicSafetyPage(<SafetyHub />)} />
            <Route path="/user/qr-check" element={publicSafetyPage(<QrSafetyCheck />)} />
            <Route path="/user/message-check" element={publicSafetyPage(<TextSafetyCheck />)} />
            <Route path="/user/otp-check" element={publicSafetyPage(<TextSafetyCheck otp />)} />
            <Route path="/user/payment-proof" element={publicSafetyPage(<PaymentProofCheck />)} />
            <Route path="/user/audio-check" element={publicSafetyPage(<AudioSafetyCheck />)} />
            <Route path="/user/shield-scan" element={publicSafetyPage(<ShieldScan />)} />
            <Route path="/user/register" element={<SafetyAccount setUser={setUser} />} />
            <Route path="/user/login" element={<SafetyAccount login setUser={setUser} />} />
            <Route path="/guardian/login" element={<GuardianAccount setUser={setUser} />} />
            <Route path="/guardian/register" element={<GuardianAccount register setUser={setUser} />} />
            <Route path="/guardian/accept/:token" element={<GuardianAccept setUser={setUser} />} />

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
                        {user.role === 'merchant' ? (
                          <>
                            <Route path="/"          element={<MerchantMode addToast={addToast} />} />
                            <Route path="/analytics" element={<Analytics addToast={addToast} />} />
                            <Route path="/merchant/qr" element={<MerchantQr />} />
                            <Route path="/fraud" element={<FraudProtectionCenter addToast={addToast} />} />
                            <Route path="/security" element={<SecurityCenter />} />
                            <Route path="/transaction/:txnId" element={<TransactionDetails />} />
                            <Route path="*"          element={<Navigate to="/" replace />} />
                          </>
                        ) : user.role === 'user' ? (
                          <>
                            <Route path="/" element={<Navigate to="/user/dashboard" replace />} />
                            <Route path="/user/dashboard" element={<SafetyDashboard />} />
                            <Route path="/user/guardian" element={<UserGuardianProtection />} />
                            <Route path="/safe" element={<Navigate to="/user/guardian" replace />} />
                            <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
                          </>
                        ) : (
                          <>
                            <Route path="/" element={<Navigate to="/guardian/dashboard" replace />} />
                            <Route path="/guardian/dashboard" element={<GuardianDashboard />} />
                            <Route path="/guardian/protected-users" element={<ProtectedUsers />} />
                            <Route path="/guardian/alerts" element={<GuardianAlerts />} />
                            <Route path="/guardian/about" element={<GuardianAbout />} />
                            <Route path="*" element={<Navigate to="/guardian/dashboard" replace />} />
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
