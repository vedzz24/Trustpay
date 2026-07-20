import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentCard from '../components/PaymentCard';
import { matchPayment, scanQR, fetchPayments } from '../utils/api';
import { QrCode, RefreshCw, Inbox, ShieldCheck, IndianRupee, Activity, AlertTriangle, PlayCircle } from 'lucide-react';

export default function MerchantMode({ addToast }) {
  const [payments, setPayments]       = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [scanInput, setScanInput]     = useState('');
  const [scanning, setScanning]       = useState(false);
  const [loading, setLoading]         = useState(true);

  // Connect to real-time stream with fallback polling
  useEffect(() => {
    loadFeed();

    const eventSource = new EventSource('http://localhost:5000/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'payment_created') {
          setPayments(prev => {
            if (prev.some(p => p._id === data._id || p.txnId === data.txnId)) return prev;
            return [data, ...prev];
          });
        } else if (type === 'payment_updated') {
          setPayments(prev => prev.map(p => (p._id === data._id || p.txnId === data.txnId) ? data : p));
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('SSE connection failed. Falling back to standard polling.');
    };

    const interval = setInterval(loadFeed, 6000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const loadFeed = async () => {
    try {
      const res = await fetchPayments();
      if (res.success) {
        setPayments(res.payments || []);
      }
    } catch {
      // Silently fail to keep dashboard clean during connection drops
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (type) => {
    const url = type === 'success'
      ? 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3'
      : 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_272445100c.mp3';
    new Audio(url).play().catch(() => {});
  };

  // Text-To-Speech (TTS) announcement for merchant convenience
  const announcePayment = (amount, name) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = `Payment of ${amount} rupees verified from ${name}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVerify = async (payment) => {
    try {
      const res = await matchPayment(payment.amount, payment.time);
      if (res.status === 'verified') {
        playAudio('success');
        announcePayment(payment.amount, payment.name);
        addToast(`₹${payment.amount} from ${payment.name} verified!`, 'success');
        loadFeed();
      } else if (res.status === 'suspicious') {
        playAudio('warning');
        addToast(res.message, 'error');
        loadFeed();
      } else {
        addToast(res.message, 'info');
      }
    } catch { addToast('Could not reach server.', 'error'); }
  };

  const handleFlag = (payment) => {
    playAudio('warning');
    addToast('Payment flagged as suspicious!', 'error');
    setPayments(p => p.map(x => x.id === payment.id ? { ...x, status: 'suspicious' } : x));
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    setScanning(true);
    try {
      const res = await scanQR(scanInput.trim());
      if (res.success) {
        playAudio('success');
        announcePayment(res.payment.amount, res.payment.name);
        addToast('QR verified! Payment added to dashboard.', 'success');
        setScanInput('');
        setShowModal(false);
        loadFeed();
      } else {
        playAudio('warning');
        addToast(res.message || 'Verification failed', 'error');
      }
    } catch { addToast('Cannot connect to verification server.', 'error'); }
    finally { setScanning(false); }
  };

  // Compute stats
  const verifiedPayments = payments.filter(p => p.status === 'verified');
  const suspiciousPayments = payments.filter(p => p.status === 'suspicious');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  const totalRevenue = verifiedPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const successRate = payments.length > 0 ? Math.round((verifiedPayments.length / payments.length) * 100) : 100;
  const fraudAttempts = suspiciousPayments.length;

  const card = "bg-white/70 dark:bg-slate-900/35 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-3xl shadow-xl shadow-slate-100/10 dark:shadow-none";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary-500/5 dark:bg-primary-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className={`${card} p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden`}>
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary-400 to-accent-500" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Operations Feed Active</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Merchant Command Center</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-0.5">Real-time payment validations, fraud forensics, and settlement counters.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-black tracking-wide text-xs uppercase rounded-2xl shadow-lg shadow-primary-500/25 active:scale-95 transition-all shrink-0">
          <QrCode className="w-4 h-4" /> Scan Customer QR
        </button>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Verified', value: `₹${totalRevenue.toLocaleString()}`, color: 'text-emerald-500 dark:text-emerald-400', icon: IndianRupee, desc: `${verifiedPayments.length} transactions` },
          { label: 'Integrity Rating', value: `${successRate}%`, color: 'text-primary-600 dark:text-primary-400', icon: ShieldCheck, desc: 'Verification success' },
          { label: 'Blocked Fraud', value: fraudAttempts, color: 'text-red-500 dark:text-red-400', icon: AlertTriangle, desc: 'Suspicious transactions' },
          { label: 'Awaiting Audit', value: pendingPayments.length, color: 'text-amber-500 dark:text-amber-400', icon: Activity, desc: 'Pending verification' }
        ].map((stat, i) => (
          <div key={i} className={`${card} p-5 flex flex-col justify-between`}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
              <div className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-xl text-slate-500">
                <stat.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Feed Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-primary-500" /> Live Transaction Stream
          </h2>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 px-2.5 py-1 rounded-full">
            Feed updates in real-time
          </span>
        </div>

        {loading ? (
          <div className={`${card} flex flex-col items-center justify-center py-20`}>
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">Loading transactions feed...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className={`${card} flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800`}>
            <Inbox className="w-12 h-12 text-slate-350 dark:text-slate-650 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">No Transaction Activity</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 max-w-xs text-center leading-relaxed">Incoming customer QR proof requests will pop up automatically on this feed.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {payments.map(p => (
                <PaymentCard key={p._id || p.id} payment={p} onVerify={handleVerify} onFlag={handleFlag} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Scan Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200/40 dark:border-slate-800 overflow-hidden">

              <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30">
                <div className="p-2.5 bg-primary-500/10 text-primary-500 rounded-xl">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-slate-800 dark:text-white text-base">Scan Proof Token</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Decrypt customer payment credentials</p>
                </div>
              </div>

              <div className="p-6">
                {/* Simulated Camera View */}
                <div className="mb-6 bg-slate-950 rounded-2xl h-36 flex flex-col items-center justify-center border border-slate-800 relative overflow-hidden">
                  <motion.div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary-400 to-accent-500 shadow-[0_0_15px_#06b6d4]"
                    animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
                  <QrCode className="w-8 h-8 text-primary-500/35 mb-2 animate-pulse" />
                  <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Awaiting scanner feed...</span>
                </div>

                <form onSubmit={handleScan} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
                      Paste cryptographic proof payload
                    </label>
                    <input type="text" value={scanInput} onChange={e => setScanInput(e.target.value)}
                      placeholder="trustpay-verify:eyJ0eG5JZ..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-250 dark:border-slate-750 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-mono text-xs outline-none focus:ring-2 focus:ring-primary-500/35 focus:border-primary-500/50 transition-all placeholder-slate-400" />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowModal(false); setScanInput(''); }}
                      className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 font-bold text-xs uppercase rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={scanning}
                      className="flex-1 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-black tracking-wide text-xs uppercase rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                      {scanning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      {scanning ? 'Verifying...' : 'Validate Code'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
