import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Check, ChevronDown, Fingerprint, LockKeyhole, Menu, Play, ShieldCheck, Sparkles, Sun, Moon, UserRound, X, Zap } from 'lucide-react';
import { login, signup, sendOtp, verifyOtp, googleLogin, completeAuthOnboarding } from '../utils/api';
import { Link } from 'react-router-dom';

const HERO_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260823_050407_500d0339-ab28-41c1-9688-132a74a3b5aa.mp4';
const ABOUT_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260823_063501_2e2c8971-de1e-473a-8611-a0c9ae7ee186.mp4';

const reveal = { 
  initial: { opacity: 0, y: 30 }, 
  whileInView: { opacity: 1, y: 0 }, 
  viewport: { once: true, margin: '-80px' }, 
  transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } 
};

const GoogleIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5.1 5.1 0 0 1-2.2 3.3v2.8h3.6c2.1-2 3.3-4.8 3.3-8.1Z"/>
    <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7a6.6 6.6 0 0 1-9.9-3.5H2.2v2.8A11 11 0 0 0 12 23Z"/>
    <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2A11 11 0 0 0 1 12c0 1.8.4 3.5 1.2 4.9l3.6-2.8Z"/>
    <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.5 4.2 1.6l3.2-3.1A10.6 10.6 0 0 0 12 1a11 11 0 0 0-9.8 6.1l3.6 2.8A6.6 6.6 0 0 1 12 5.4Z"/>
  </svg>
);

export default function Auth({ setUser, addToast, theme, toggleTheme }) {
  const [modal, setModal] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [method, setMethod] = useState('email');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [statusText, setStatusText] = useState('');
  const [onboarding, setOnboarding] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', phoneNumber: '', businessName: '', upiId: '' });
  
  const heroVideoRef = useRef(null);
  const aboutVideoRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.35], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.24], [1, 0]);

  // Robust play retry logic
  useEffect(() => {
    const playVideo = (videoEl) => {
      if (videoEl) {
        videoEl.muted = true;
        videoEl.play().catch(() => {});
      }
    };

    const interval = setInterval(() => {
      playVideo(heroVideoRef.current);
      playVideo(aboutVideoRef.current);
    }, 1000);

    const handleInteraction = () => {
      playVideo(heroVideoRef.current);
      playVideo(aboutVideoRef.current);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const openAuth = (v = true) => { setIsLogin(v); setModal(true); setMobile(false); setAuthError(''); setOnboarding(null); };
  const openRole = role => { set('role', role); openAuth(true); };

  const sendCode = async () => {
    if (!form.phoneNumber.trim()) return addToast('Enter your phone number', 'error');
    setLoading(true);
    setAuthError('');
    setStatusText('Sending secure code...');
    try {
      const r = await sendOtp(form.phoneNumber, form.role);
      if (r.success) {
        setOtpSent(true);
        setStatusText(`Code sent to ${r.phoneNumber}`);
        addToast('Secure code sent', 'success');
      } else {
        setAuthError(r.message || 'We could not send the verification code. Please try again.');
        setStatusText('');
      }
    } catch {
      setAuthError('Cannot connect to TrustPay server.');
      setStatusText('');
    } finally {
      setLoading(false);
    }
  };

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    try {
      let r;
      if (onboarding) {
        r = await completeAuthOnboarding({ onboardingToken: onboarding.token, name: form.name, email: form.email, password: form.password, merchantName: form.name, businessName: form.businessName, upiId: form.upiId });
      } else if (method === 'phone') {
        if (!otpSent) {
          setLoading(false);
          return sendCode();
        }
        setStatusText('Verifying...');
        r = await verifyOtp(form.phoneNumber, otp, form.role);
      } else if (isLogin) {
        setStatusText('Signing in...');
        r = await login(form.email, form.password, form.role);
      } else {
        r = await signup(form.name, form.email, form.password, form.role, form.phoneNumber, form.businessName, form.upiId);
      }

      if (r.success && (r.requiresProfileCompletion || r.requiresMerchantOnboarding)) {
        setOnboarding({ token: r.onboardingToken, merchant: Boolean(r.requiresMerchantOnboarding), provider: 'phone' });
        setStatusText('Identity verified. Complete your profile.');
      } else if (r.success && r.user) {
        addToast(`Welcome${r.user?.name ? `, ${r.user.name}` : ''}!`, 'success');
        setUser(r.user);
      } else {
        setAuthError(r.message || 'Authentication failed');
        setStatusText('');
      }
    } catch {
      setAuthError('Cannot connect to TrustPay server.');
      setStatusText('');
    } finally {
      setLoading(false);
    }
  };

  const finishGoogleLogin = async credential => {
    setLoading(true);
    setAuthError('');
    setStatusText('Connecting to Google...');
    try {
      const invitationToken = sessionStorage.getItem('trustpay_guardian_invitation') || undefined;
      const r = await googleLogin(credential, form.role, invitationToken);
      if (r.success && r.requiresMerchantOnboarding) {
        const encodedClaims = credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const claims = JSON.parse(atob(encodedClaims.padEnd(Math.ceil(encodedClaims.length / 4) * 4, '=')));
        setForm(current => ({ ...current, name: claims.name || '', email: claims.email || '' }));
        setOnboarding({ token: r.onboardingToken, merchant: true, provider: 'google' });
        setStatusText('Google identity verified. Complete merchant onboarding.');
      } else if (r.success && r.user) {
        if (r.guardianInvitationAccepted) sessionStorage.removeItem('trustpay_guardian_invitation');
        setUser(r.user);
        addToast(`Welcome, ${r.user.name}!`, 'success');
      } else {
        setAuthError(r.message || 'Google sign-in could not be verified.');
        setStatusText('');
      }
    } catch {
      setAuthError('Google sign-in could not be verified.');
      setStatusText('');
    } finally {
      setLoading(false);
    }
  };

  const startGoogleLogin = () => {
    setAuthError('');
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return setAuthError('Google sign-in is not configured.');
    const launch = () => {
      window.google.accounts.id.initialize({ client_id: clientId, callback: response => finishGoogleLogin(response.credential) });
      setLoading(true);
      setStatusText('Connecting to Google...');
      window.google.accounts.id.prompt(notification => {
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          setLoading(false); setStatusText(''); setAuthError('Google sign-in could not be opened. Check browser popup and third-party cookie settings.');
        }
      });
    };
    if (window.google?.accounts?.id) return launch();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
    script.onload = launch;
    script.onerror = () => { setLoading(false); setStatusText(''); setAuthError('Google sign-in could not be loaded.'); };
    document.head.appendChild(script);
  };

  const inputCls = 'w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white/60 dark:bg-white/[.055] px-4 py-3.5 text-sm text-[#2b3033] dark:text-white outline-none placeholder:text-slate-500 focus:border-[#15BCDF] focus:ring-2 focus:ring-[#15BCDF]/20 transition-all';

  return (
    <div className="landing-shell min-h-screen bg-[#F2F1F0] dark:bg-[#111] text-[#2b3033] dark:text-white selection:bg-[#15BCDF] selection:text-white font-sans transition-colors duration-500">
      
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 px-4 py-4 md:px-8">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between rounded-xl border border-slate-300 dark:border-white/10 bg-[#F2F1F0]/90 dark:bg-[#111]/90 px-6 shadow-md backdrop-blur-xl transition-all">
          <a href="#top" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#15BCDF] text-white">
              <ShieldCheck className="h-5 w-5"/>
            </span>
            <span className="text-xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">
              trustpay<span className="text-[#15BCDF]">.</span>
            </span>
          </a>
          
          <nav className="hidden items-center gap-8 text-xs font-bold uppercase tracking-wider text-[#3a3a3a] dark:text-slate-300 md:flex">
            <a href="#platform" className="hover:text-[#15BCDF] transition-colors">Platform</a>
            <a href="#security" className="hover:text-[#15BCDF] transition-colors">Security</a>
            <a href="#how" className="hover:text-[#15BCDF] transition-colors">How it works</a>
          </nav>
          
          <div className="hidden items-center gap-4 md:flex">
            <button onClick={toggleTheme} aria-label="Toggle theme" className="grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-slate-300">
              {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400"/> : <Moon className="h-5 w-5"/>}
            </button>
            <button onClick={() => openAuth(true)} className="h-10 rounded-lg px-4 text-xs font-bold uppercase tracking-wider text-[#3a3a3a] dark:text-white hover:bg-slate-250 dark:hover:bg-white/10 transition-all">
              Sign in
            </button>
            <button onClick={() => openAuth(false)} className="btn-chamfered h-11 bg-[#15BCDF] hover:bg-[#3fd0ef] border border-[#0fa3c2] px-6 text-xs font-bold uppercase tracking-wider text-[#111] transition-all shadow-md shadow-[#15BCDF]/10">
              Get Started
            </button>
          </div>
          
          <button onClick={() => setMobile(v => !v)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-lg border border-slate-350 dark:border-white/10 md:hidden text-slate-800 dark:text-white">
            {mobile ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
          </button>
        </div>
        
        {mobile && (
          <div className="mx-auto mt-2 max-w-7xl rounded-xl border border-slate-350 dark:border-white/10 bg-[#F2F1F0] dark:bg-[#1a1c1e] p-4 shadow-xl md:hidden">
            <nav className="flex flex-col font-bold text-xs uppercase tracking-wider text-[#3a3a3a] dark:text-slate-300">
              <a className="p-3 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg" href="#platform">Platform</a>
              <a className="p-3 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg" href="#security">Security</a>
              <a className="p-3 hover:bg-slate-200 dark:hover:bg-white/5 rounded-lg" href="#how">How it works</a>
            </nav>
            <button onClick={() => openAuth(false)} className="w-full mt-3 rounded-lg bg-[#15BCDF] p-3 text-xs font-bold uppercase tracking-wider text-[#111]">
              Get started
            </button>
          </div>
        )}
      </header>
      
      <main id="top">
        
        {/* Section 1 — Hero */}
        <section className="relative flex min-h-[100svh] items-end overflow-hidden px-6 pb-16 pt-32 md:px-12 md:pb-24 bg-[#F2F1F0] dark:bg-[#111]">
          
          {/* Background Video */}
          <video 
            ref={heroVideoRef}
            className="absolute top-0 right-[-20%] md:right-[-10%] w-[119%] md:w-[99%] h-auto object-contain pointer-events-none z-0 opacity-80 mix-blend-multiply dark:mix-blend-normal"
            autoPlay 
            muted 
            loop 
            playsInline
            preload="auto"
          >
            <source src={HERO_VIDEO} type="video/mp4"/>
          </video>

          {/* Desktop Left Scrim */}
          <div className="hidden md:block absolute inset-0 left-0 w-[70%] bg-gradient-to-r from-[#F2F1F0] via-[#F2F1F0] to-transparent dark:from-[#111] dark:via-[#111] z-10 pointer-events-none" />
          
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-20 mx-auto w-full max-w-7xl pt-[360px] md:pt-0">
            
            {/* Staircase Headline */}
            <h1 className="max-w-5xl text-[clamp(34px,7.6vw,80px)] font-bold leading-[0.98] uppercase tracking-wide text-[#2b3033] dark:text-white">
              SCALING<br/>
              THE<br/>
              PLATFORM<br/>
              <span className="block pl-[min(238px,28vw)]">FOR</span>
              <span className="block pl-[min(238px,28vw)]">YOUR</span>
              <span className="block pl-[min(238px,28vw)] text-[#15BCDF]">BUSINESS</span>
            </h1>

            {/* CTA Button */}
            <div className="mt-8 pl-[min(238px,28vw)]">
              <button 
                onClick={() => openAuth(false)} 
                className="btn-chamfered relative group flex items-center justify-center gap-3 bg-[#15BCDF] hover:bg-[#3fd0ef] border border-[#0fa3c2] px-8 py-4.5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1c1e] transition-all"
                style={{
                  boxShadow: '0 0 0 1px rgba(21,188,223,0.35), 0 10px 30px -12px rgba(15,163,194,0.6)'
                }}
              >
                GET STARTED
                <span className="w-6 h-px bg-[#1a1c1e] group-hover:w-8 transition-all" />
              </button>
              <div className="mt-4 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-3">
                <Link to="/user" className="rounded-lg border border-[#15BCDF]/40 bg-[#15BCDF]/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider text-[#15BCDF]">User Safety</Link>
                <button onClick={() => openRole('merchant')} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-wider">Merchant</button>
                <Link to="/guardian/login" className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-3 text-center text-[10px] font-black uppercase tracking-wider">Guardian</Link>
              </div>
            </div>

          </motion.div>
        </section>
        
        {/* Section 2 — About */}
        <section id="security" className="relative flex flex-wrap items-center gap-[40px] py-[clamp(60px,10vw,140px)] pl-[clamp(20px,9vw,118px)] pr-0 bg-gradient-to-b from-[#F2F1F0] via-[#F7F6F8] to-[#F7F6F8] dark:from-[#111] dark:to-[#1a1c1e]">
          
          {/* Left Column */}
          <div className="flex-1 min-w-[300px] max-w-[520px] z-10">
            
            <h2 className="text-[clamp(34px,6.5vw,72px)] font-bold leading-[0.98] uppercase tracking-wide text-[#2b3033] dark:text-white">
              BANK-GRADE<br/>
              <span className="block pl-[min(160px,18vw)] text-[#15BCDF]">SECURITY</span>
            </h2>

            {/* Copy verbatim */}
            <p className="mt-[32px] ml-[min(160px,18vw)] text-[clamp(14px,1.6vw,17px)] line-height-[1.7] text-[#6b6f72] dark:text-slate-350 font-medium">
              TrustPay secures every transaction with military-grade encryption and real-time fraud detection. Your peace of mind is our top priority, ensuring safe, seamless, and transparent payments every time.
            </p>

            {/* Learn More Button */}
            <div className="mt-[36px] ml-[min(160px,18vw)]">
              <button 
                onClick={() => openAuth(true)}
                className="btn-chamfered group flex items-center justify-center gap-3 bg-[#15BCDF] hover:bg-[#3fd0ef] border border-[#0fa3c2] px-8 py-4.5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1c1e] transition-all"
                style={{
                  boxShadow: '0 0 0 1px rgba(21,188,223,0.35), 0 10px 30px -12px rgba(15,163,194,0.6)'
                }}
              >
                LEARN MORE
                <span className="w-6 h-px bg-[#1a1c1e] group-hover:w-8 transition-all" />
              </button>
            </div>

          </div>

          {/* Right Column */}
          <div className="flex-1 min-w-[280px] flex justify-end relative">
            <video 
              ref={aboutVideoRef}
              className="w-full max-w-[644px] h-auto object-cover z-0"
              autoPlay 
              muted 
              loop 
              playsInline
              preload="auto"
            >
              <source src={ABOUT_VIDEO} type="video/mp4"/>
            </video>
            
            {/* Overlay Cyan tint */}
            <div className="absolute inset-0 right-0 w-full max-w-[644px] h-full bg-[#15BCDF] mix-blend-hue pointer-events-none z-10 opacity-70" />
          </div>

        </section>

        {/* Core Architecture Section */}
        <section id="platform" className="px-6 py-24 md:px-12 md:py-32 max-w-7xl mx-auto">
          <motion.div {...reveal}>
            <div className="mb-16 grid gap-8 lg:grid-cols-2 lg:items-end">
              <div>
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#15BCDF]">Payment Trust Engine</p>
                <h2 className="text-3xl font-bold uppercase leading-[0.98] tracking-wide text-[#2b3033] dark:text-white md:text-5xl">
                  ZERO TRUST ARCHITECTURE.<br/>
                  VERIFIED DEPOSITS.
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-relaxed text-[#6b6f72] dark:text-slate-450 lg:justify-self-end font-medium">
                TrustPay combines QR verification, text threat analysis, live payment confirmations, and linked Guardian alerts inside one central Payment Trust Engine.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-12">
              <Feature onClick={() => { openAuth(true); addToast('Please sign in to access this feature', 'info'); }} wide n="01" icon={Fingerprint} title="PAYMENT PROOF ANALYZER" text="Analyze digital screenshots and transactions to check font consistency and editing artifacts in second-level canvas forensics."/>
              <Feature onClick={() => { openAuth(true); addToast('Please sign in to access this feature', 'info'); }} n="02" icon={Zap} title="LIVE MATCH ENGINE" text="Simulated server logs confirm settlement status before authorizing item exchanges."/>
              <Feature onClick={() => { openAuth(true); addToast('Please sign in to access this feature', 'info'); }} n="03" icon={UserRound} title="GUARDIAN PROTECTION" text="Share HIGH and CRITICAL TrustPay safety alerts with a trusted linked Guardian."/>
              <Feature onClick={() => { openAuth(true); addToast('Please sign in to access this feature', 'info'); }} wide n="04" icon={Sparkles} title="TRANSACTION REGISTRY" text="Generate dynamic HMAC time-locked QR codes to maintain structural receipt hashes securely."/>
            </div>
          </motion.div>
        </section>
        
        {/* Steps Section */}
        <section id="how" className="px-6 py-24 md:px-12 md:py-32 max-w-7xl mx-auto">
          <motion.div {...reveal}>
            <p className="text-xs font-bold uppercase tracking-widest text-[#15BCDF]">Operations Protocol</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-bold uppercase leading-[0.98] tracking-wide text-[#2b3033] dark:text-white md:text-5xl">Verify details in three steps.</h2>
            
            <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-slate-300 dark:border-white/10 bg-slate-300 dark:bg-white/10 md:grid-cols-3">
              {[['01', 'CONNECT', 'Register role configuration credentials safely.'], ['02', 'VALIDATE', 'Generate dynamic verification QR requests or scan them.'], ['03', 'SETTLE', 'Confirm transaction parameters via cryptographic signature hashes.']].map(([n, t, d]) => (
                <div key={n} className="bg-[#F2F1F0] dark:bg-[#111] p-8 md:p-10 flex flex-col justify-between min-h-[220px]">
                  <span className="text-sm font-bold text-[#15BCDF]">{n}</span>
                  <div>
                    <h3 className="text-lg font-bold uppercase text-[#2b3033] dark:text-white tracking-wider">{t}</h3>
                    <p className="mt-2 text-xs font-medium text-[#6b6f72] dark:text-slate-450 leading-relaxed">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
        
      </main>
      
      {/* Redesigned Footer */}
      <footer className="border-t border-slate-300 dark:border-white/10 px-6 py-12 bg-[#F2F1F0] dark:bg-[#111]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 text-xs font-bold uppercase tracking-wider text-slate-500 md:flex-row md:justify-between items-center">
          <p>© 2026 TrustPay. Secure Digital Payment Verification System.</p>
          <div className="flex gap-6 items-center">
            <a href="#security" className="hover:text-[#15BCDF] transition-colors">Security</a>
            <button onClick={() => openAuth(true)} className="hover:text-[#15BCDF] transition-colors uppercase font-bold text-xs">Sign in</button>
          </div>
        </div>
      </footer>
      
      {/* Authentication Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-md" onMouseDown={e => e.target === e.currentTarget && setModal(false)}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15 }} className="relative w-full max-w-md rounded-xl border border-slate-300 dark:border-white/10 bg-[#F2F1F0] dark:bg-[#1a1c1e] p-6 shadow-2xl md:p-8 text-[#2b3033] dark:text-white">
              
              <button onClick={() => setModal(false)} aria-label="Close" className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-lg border border-slate-355 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/5">
                <X className="h-4.5 w-4.5"/>
              </button>
              
              <div className="mb-6 grid h-12 w-12 place-items-center rounded-lg bg-[#15BCDF] text-white">
                <LockKeyhole className="h-5 w-5"/>
              </div>
              
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#15BCDF]">Secure Verification Access</p>
              <h2 className="mt-2 text-2xl font-bold uppercase tracking-wider">{isLogin ? 'Welcome Back.' : 'Get Protected.'}</h2>
              <p className="mt-1 text-xs text-[#6b6f72] dark:text-slate-400 font-medium">{isLogin ? 'Enter credentials to authorize access.' : 'Configure secure trust verification access.'}</p>
              
              <div className="mt-6 grid grid-cols-3 rounded-lg bg-slate-200 dark:bg-white/5 p-1 text-xs font-bold uppercase tracking-wider">
                {['user', 'merchant', 'guardian'].map(r => (
                  <button key={r} type="button" onClick={() => { set('role', r); setOtpSent(false); setOtp(''); setOnboarding(null); setAuthError(''); }} className={`rounded-md py-2.5 transition-all ${form.role === r ? 'bg-[#15BCDF] text-white' : 'text-slate-500 hover:text-slate-750 dark:hover:text-slate-200'}`}>
                    {r}
                  </button>
                ))}
              </div>
              
              {!onboarding && (
                <div className="mt-4 flex gap-4 border-b border-slate-200 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider">
                  <button type="button" onClick={() => setMethod('email')} className={`pb-2.5 transition-all ${method === 'email' ? 'border-b-2 border-[#15BCDF] text-[#15BCDF]' : 'text-slate-500'}`}>Email</button>
                  <button type="button" onClick={() => setMethod('phone')} className={`pb-2.5 transition-all ${method === 'phone' ? 'border-b-2 border-[#15BCDF] text-[#15BCDF]' : 'text-slate-500'}`}>Phone OTP</button>
                </div>
              )}
              
              <form onSubmit={submit} className="mt-5 space-y-4">
                {(!isLogin || onboarding) && (
                  <input required className={inputCls} placeholder="Full Name" value={form.name} onChange={e => set('name', e.target.value)}/>
                )}

                {(onboarding?.merchant || (!isLogin && form.role === 'merchant')) && (
                  <>
                    <input required className={inputCls} placeholder="Business Name" value={form.businessName} onChange={e => set('businessName', e.target.value)}/>
                    <input className={inputCls} placeholder="UPI ID (optional)" value={form.upiId} onChange={e => set('upiId', e.target.value)}/>
                  </>
                )}

                {(onboarding || method === 'email') && (
                  <>
                    <input required type="email" autoComplete="email" className={inputCls} placeholder="Email address" value={form.email} onChange={e => set('email', e.target.value)}/>
                    <input required={!onboarding || onboarding.provider === 'phone'} type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} minLength={6} className={inputCls} placeholder={onboarding?.provider === 'google' ? 'Password (optional for Google)' : 'Password'} value={form.password} onChange={e => set('password', e.target.value)}/>
                  </>
                )}

                {!onboarding && method === 'phone' && (
                  <>
                    <input required type="tel" className={inputCls} placeholder="Phone number" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)}/>
                    {otpSent && (
                      <input required className={`${inputCls} text-center tracking-widest text-lg font-bold font-mono`} placeholder="OTP" value={otp} onChange={e => setOtp(e.target.value)}/>
                    )}
                  </>
                )}

                {authError && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-medium text-red-600 dark:text-red-300">{authError}</p>}
                {statusText && !authError && <p aria-live="polite" className="text-center text-xs font-medium text-[#15BCDF]">{statusText}</p>}

                <button disabled={loading} className="btn-chamfered flex w-full items-center justify-center gap-2 bg-[#15BCDF] hover:bg-[#3fd0ef] border border-[#0fa3c2] py-4 text-xs font-bold uppercase tracking-wider text-[#111] disabled:opacity-50 transition-all">
                  {loading ? (method === 'phone' ? (otpSent ? 'Verifying...' : 'Sending secure code...') : 'Signing in...') : onboarding ? (onboarding.merchant ? 'Complete Merchant Profile' : 'Complete Profile') : method === 'phone' ? (otpSent ? 'Verify & Login' : 'Send Secure Code') : isLogin ? 'Sign in' : 'Create Profile'}
                  <ArrowRight className="h-4 w-4"/>
                </button>
              </form>
              
              <div className="my-5 flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                <span className="h-px flex-1 bg-slate-300 dark:bg-white/10"/>or<span className="h-px flex-1 bg-slate-300 dark:bg-white/10"/>
              </div>
              
              <button disabled={loading} onClick={startGoogleLogin} className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-355 dark:border-white/10 py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/5 transition-all text-[#2b3033] dark:text-white disabled:opacity-50">
                <GoogleIcon/>{loading && statusText === 'Connecting to Google...' ? 'Connecting to Google...' : 'Continue with Google'}
              </button>
              
              <p className="mt-6 text-center text-xs font-bold uppercase tracking-wider text-slate-500">
                {isLogin ? 'New to TrustPay?' : 'Already registered?'} <button type="button" onClick={() => setIsLogin(v => !v)} className="text-[#15BCDF] hover:underline hover:underline-offset-4 font-bold">{isLogin ? 'Register account' : 'Sign in'}</button>
              </p>
              
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}

function Feature({ n, icon: Icon, title, text, wide, onClick }) {
  return (
    <motion.article onClick={onClick} {...reveal} className={`${wide ? 'md:col-span-7' : 'md:col-span-5'} ${onClick ? 'cursor-pointer' : ''} group min-h-[300px] rounded-xl border border-slate-300 dark:border-white/10 bg-white/60 dark:bg-[#1a1c1e] p-8 hover:border-[#15BCDF] dark:hover:border-[#15BCDF]/60 transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-[#15BCDF]">{n}</span>
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#15BCDF]/10 text-[#15BCDF] group-hover:scale-105 transition-transform"><Icon/></span>
      </div>
      <div>
        <h3 className="text-lg font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">{title}</h3>
        <p className="mt-2 text-xs font-medium text-[#6b6f72] dark:text-slate-400 leading-relaxed">{text}</p>
      </div>
    </motion.article>
  );
}
