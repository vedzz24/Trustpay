import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PaymentCard from '../components/PaymentCard';
import { matchPayment, scanQR, fetchPayments, generateProof } from '../utils/api';
import { QrCode, RefreshCw, Inbox, ShieldCheck, IndianRupee, Activity, AlertTriangle, Plus, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MerchantMode({ addToast }) {
  const [payments, setPayments] = useState([]);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  // Payment Request fields
  const [reqAmount, setReqAmount] = useState('');
  const [reqBillRef, setReqBillRef] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [createdRequest, setCreatedRequest] = useState(null);
  const [creatingReq, setCreatingReq] = useState(false);

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
    } catch {}
    finally { setLoading(false); }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!reqAmount || parseFloat(reqAmount) <= 0) return addToast('Enter a valid amount', 'error');
    setCreatingReq(true);
    setCreatedRequest(null);
    try {
      const data = await generateProof(reqAmount, reqBillRef || `Bill-${Date.now().toString().slice(-4)}`, 'ABC Store');
      if (data.success) {
        setCreatedRequest(data);
        addToast('Structural Payment Request Generated successfully.', 'success');
        loadFeed();
      }
    } catch {
      addToast('Failed to create payment request.', 'error');
    } finally {
      setCreatingReq(false);
    }
  };

  const handleVerify = async (payment) => {
    try {
      const res = await matchPayment(payment.amount, payment.time);
      if (res.status === 'verified') {
        addToast(`₹${payment.amount} from ${payment.name} verified!`, 'success');
        loadFeed();
      } else {
        addToast(res.message, 'error');
      }
    } catch {
      addToast('Cannot connect to verification server.', 'error');
    }
  };

  const handleFlag = (payment) => {
    addToast('Payment flagged as suspicious!', 'error');
    setPayments(p => p.map(x => x._id === payment._id ? { ...x, status: 'suspicious' } : x));
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    setScanning(true);
    try {
      const res = await scanQR(scanInput.trim());
      if (res.success) {
        addToast('QR verified! Settlement logged to ledger.', 'success');
        setScanInput('');
        setShowScanModal(false);
        loadFeed();
      } else {
        addToast(res.message || 'Verification failed', 'error');
      }
    } catch { addToast('Verification failed.', 'error'); }
    finally { setScanning(false); }
  };

  // Compute stats
  const verifiedPayments = payments.filter(p => p.status === 'verified');
  const suspiciousPayments = payments.filter(p => p.status === 'suspicious');
  const pendingPayments = payments.filter(p => p.status === 'pending');

  const totalRevenue = verifiedPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const successRate = payments.length > 0 ? Math.round((verifiedPayments.length / payments.length) * 100) : 100;

  const card = "bg-white/65 dark:bg-[#1a1c1e] backdrop-blur-xl border border-slate-300 dark:border-white/10 rounded-xl shadow-sm hover:shadow-md transition-all";
  const inputCls = "w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 text-[#2b3033] dark:text-white outline-none focus:ring-1 focus:ring-[#15BCDF]";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-sans min-h-screen">
      
      {/* Header */}
      <div className={`${card} p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">PAYMENTS YOU CAN VERIFY.</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
            Real-time verification feeds, dynamic payment requests, and security logs.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={() => setShowScanModal(true)} className="btn-chamfered flex items-center justify-center gap-2 px-5 py-3 bg-[#15BCDF] hover:bg-[#3fd0ef] text-white font-bold uppercase text-xs tracking-wider transition-colors shadow-sm">
            <QrCode className="w-4 h-4" /> Scan QR code
          </button>
          <button onClick={() => { setCreatedRequest(null); setShowCreateModal(true); }} className="btn-chamfered flex items-center justify-center gap-2 px-5 py-3 bg-[#2b3033] dark:bg-white/5 border border-slate-350 dark:border-white/10 hover:bg-[#15BCDF] text-slate-800 dark:text-white hover:text-white font-bold uppercase text-xs tracking-wider transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Create Request
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: `₹${totalRevenue.toLocaleString()}`, color: 'text-[#2b3033] dark:text-white', icon: IndianRupee },
          { label: 'Total Payments', value: payments.length, color: 'text-[#15BCDF]', icon: ClipboardList },
          { label: 'Pending Audits', value: pendingPayments.length, color: 'text-amber-500', icon: Activity },
          { label: 'Blocked Threats', value: suspiciousPayments.length, color: 'text-red-500', icon: AlertTriangle }
        ].map((item, i) => (
          <div key={i} className={`${card} p-5 flex flex-col justify-between`}>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</span>
            <div className="flex items-end justify-between mt-4">
              <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
              <item.icon className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      {/* Live Transaction Stream */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#15BCDF]" /> Live Transaction Ledger
        </h2>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Checking for logs...</div>
        ) : payments.length === 0 ? (
          <div className={`${card} py-16 text-center text-slate-500 italic`}>No merchant ledger activities registered yet.</div>
        ) : (
          <div className="space-y-3">
            {payments.map(p => (
              <PaymentCard key={p._id} payment={p} onVerify={handleVerify} onFlag={handleFlag} />
            ))}
          </div>
        )}
      </div>

      {/* Scan Modal */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 p-4 backdrop-blur-md flex items-center justify-center">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#F2F1F0] dark:bg-[#1a1c1e] w-full max-w-md rounded-xl border border-slate-300 dark:border-white/10 p-6 text-[#2b3033] dark:text-white">
              <h3 className="text-base font-bold uppercase tracking-wider mb-4">Verify Customer Code</h3>
              <form onSubmit={handleScan} className="space-y-4">
                <input required type="text" value={scanInput} onChange={e => setScanInput(e.target.value)} className={inputCls} placeholder="Paste verification payload code here..." />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowScanModal(false)} className="flex-1 py-2.5 bg-slate-200 dark:bg-white/5 text-xs font-bold uppercase tracking-wider rounded-lg text-slate-700 dark:text-slate-300">Cancel</button>
                  <button type="submit" disabled={scanning} className="flex-1 py-2.5 bg-[#15BCDF] text-xs font-bold uppercase tracking-wider rounded-lg text-white">
                    {scanning ? 'Verifying...' : 'Settle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Request Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 p-4 backdrop-blur-md flex items-center justify-center">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#F2F1F0] dark:bg-[#1a1c1e] w-full max-w-lg rounded-xl border border-slate-300 dark:border-white/10 p-6 text-[#2b3033] dark:text-white">
              <h3 className="text-base font-bold uppercase tracking-wider mb-4">Create Payment Request</h3>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6b6f72] dark:text-slate-400 mb-1">Amount (₹)</label>
                  <input required type="number" min="1" value={reqAmount} onChange={e => setReqAmount(e.target.value)} className={inputCls} placeholder="e.g. 750" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6b6f72] dark:text-slate-400 mb-1">Bill Reference ID</label>
                  <input type="text" value={reqBillRef} onChange={e => setReqBillRef(e.target.value)} className={inputCls} placeholder="e.g. Bill-829105" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6b6f72] dark:text-slate-400 mb-1">Description</label>
                  <input type="text" value={reqDesc} onChange={e => setReqDesc(e.target.value)} className={inputCls} placeholder="Order description" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-slate-200 dark:bg-white/5 text-xs font-bold uppercase tracking-wider rounded-lg text-slate-700 dark:text-slate-300">Close</button>
                  <button type="submit" disabled={creatingReq} className="flex-1 py-2.5 bg-[#15BCDF] text-xs font-bold uppercase tracking-wider rounded-lg text-white">
                    {creatingReq ? 'Creating Request...' : 'Generate Request'}
                  </button>
                </div>
              </form>

              {createdRequest && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5 flex gap-4 items-center flex-col sm:flex-row bg-slate-100/50 dark:bg-black/25 p-4 rounded-lg">
                  <div className="bg-white p-2 rounded-lg shrink-0">
                    <img src={createdRequest.qrCodeData} alt="Request QR" className="w-28 h-28 mix-blend-multiply" />
                  </div>
                  <div className="space-y-1.5 text-xs font-bold w-full">
                    <div className="flex justify-between border-b border-slate-200 dark:border-white/5 pb-1">
                      <span className="text-slate-400">Order Ref</span>
                      <span className="text-[#2b3033] dark:text-white font-mono">{createdRequest.details.txnId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Integrity Signature</span>
                      <span className="text-[#15BCDF] font-mono tracking-tighter text-[9px] break-all max-w-[150px]">{createdRequest.details.hash}</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
