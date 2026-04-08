import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentCard from '../components/PaymentCard';
import { matchPayment, scanQR } from '../utils/api';
import { QrCode, RefreshCw, Inbox } from 'lucide-react';

export default function MerchantMode({ addToast }) {
  const [payments, setPayments]       = useState([]);
  const [showModal, setShowModal]     = useState(false);
  const [scanInput, setScanInput]     = useState('');
  const [scanning, setScanning]       = useState(false);

  const playAudio = (type) => {
    const url = type === 'success'
      ? 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3'
      : 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_272445100c.mp3';
    new Audio(url).play().catch(() => {});
  };

  const handleVerify = async (payment) => {
    try {
      const res = await matchPayment(payment.amount, payment.time);
      if (res.status === 'verified') {
        playAudio('success');
        addToast(`₹${payment.amount} from ${payment.name} verified!`, 'success');
        setPayments(p => p.map(x => x.id === payment.id ? { ...x, status: 'verified' } : x));
      } else if (res.status === 'suspicious') {
        playAudio('warning');
        addToast(res.message, 'error');
        setPayments(p => p.map(x => x.id === payment.id ? { ...x, status: 'suspicious' } : x));
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
        addToast('QR verified! Payment added to dashboard.', 'success');
        setPayments(prev => {
          const exists = prev.find(p => p.id === res.payment.id);
          if (exists) return prev.map(p => p.id === res.payment.id ? { ...p, status: 'verified' } : p);
          return [{ ...res.payment, status: 'verified' }, ...prev];
        });
        setScanInput('');
        setShowModal(false);
      } else {
        playAudio('warning');
        addToast(res.message || 'Verification failed', 'error');
      }
    } catch { addToast('Cannot connect to verification server.', 'error'); }
    finally { setScanning(false); }
  };

  const card = "bg-white dark:bg-slate-800 border border-slate-100 dark:border-cyan-200 rounded-2xl shadow-sm";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className={`${card} p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div>
          <h1 className="text-2xl font-black text-cyan-600 dark:text-slate-100">Merchant Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-300 text-sm mt-1">Scan a customer's TrustPay QR to verify payments instantly.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-500 text-white font-bold rounded-xl shadow transition-all active:scale-95 shrink-0">
          <QrCode className="w-5 h-5" /> Scan QR Code
        </button>
      </div>

      {/* Feed */}
      {payments.length === 0 ? (
        <div className={`${card} flex flex-col items-center justify-center py-20 border-dashed`}>
          <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-500 mb-4" />
          <p className="text-slate-500 dark:text-slate-500 font-semibold">No payments yet.</p>
          <p className="text-slate-300 dark:text-slate-500 text-sm mt-1">Scan a customer QR code to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {payments.map(p => (
              <PaymentCard key={p.id} payment={p} onVerify={handleVerify} onFlag={handleFlag} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Scan Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] bg-cyan-600/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale:.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.9, opacity:0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-cyan-200 overflow-hidden">

              <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 dark:border-cyan-200 bg-slate-50 dark:bg-slate-900">
                <div className="p-2 bg-slate-100 dark:bg-cyan-500 rounded-lg">
                  <QrCode className="w-5 h-5 text-slate-500 dark:text-slate-100" />
                </div>
                <div>
                  <h2 className="font-bold text-cyan-600 dark:text-slate-100">Scan Customer QR</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-300">Paste the proof code from the customer's screen</p>
                </div>
              </div>

              <div className="p-6">
                {/* Mock camera view */}
                <div className="mb-4 bg-cyan-600 dark:bg-slate-900 rounded-xl h-32 flex items-center justify-center border-2 border-dashed border-cyan-200 relative overflow-hidden">
                  <motion.div className="absolute top-0 left-0 right-0 h-0.5 bg-warning opacity-80"
                    animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} />
                  <span className="text-slate-300 text-sm font-medium">📷 Camera view (simulated)</span>
                </div>

                <form onSubmit={handleScan} className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-500 dark:text-slate-200 mb-1.5">
                      Or paste proof code manually
                    </label>
                    <input type="text" value={scanInput} onChange={e => setScanInput(e.target.value)}
                      placeholder="trustpay-verify:TRX..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-cyan-200 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-mono text-sm outline-none focus:ring-2 focus:ring-slate-500 transition-all" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setShowModal(false); setScanInput(''); }}
                      className="flex-1 py-2.5 bg-slate-50 dark:bg-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-500 text-cyan-600 dark:text-slate-100 font-semibold rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={scanning}
                      className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                      {scanning && <RefreshCw className="w-4 h-4 animate-spin" />}
                      {scanning ? 'Verifying...' : 'Verify Payment'}
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
