import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, FileSearch, ShieldCheck, ShieldAlert, Clock, CheckCircle2 } from 'lucide-react';
import { generateProof, checkScam, fetchPayments } from '../utils/api';
import { cn } from '../utils/cn';

export default function UserMode({ addToast, user }) {
  const [amount, setAmount]       = useState('');
  const [note, setNote]           = useState('');
  const [proofData, setProofData] = useState(null);
  const [generating, setGen]      = useState(false);

  const [scamText, setScamText]     = useState('');
  const [scamResult, setScamResult] = useState(null);
  const [checking, setChecking]     = useState(false);

  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetchPayments()
      .then(r => setTimeline((r.payments || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  const handleProof = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return addToast('Enter a valid amount', 'error');
    setGen(true);
    try {
      const data = await generateProof(amount, note, user?.name);
      if (data.success) { setProofData(data); addToast('Payment proof ready! Show QR to the merchant.', 'success'); }
      else addToast(data.message || 'Failed to generate proof', 'error');
    } catch { addToast('Cannot reach server. Is the backend running?', 'error'); }
    finally { setGen(false); }
  };

  const handleScam = async (e) => {
    e.preventDefault();
    if (!scamText.trim()) return addToast('Paste a message to check', 'error');
    setChecking(true);
    try {
      const data = await checkScam(scamText);
      setScamResult(data);
      addToast(data.result === 'Safe' ? 'Message looks safe' : '⚠️ Potential scam detected!', data.result === 'Safe' ? 'success' : 'error');
    } catch { addToast('Error checking message', 'error'); }
    finally { setChecking(false); }
  };

  const card = "bg-cream-100 dark:bg-brown-500 border border-brown-100 dark:border-brown-400 rounded-2xl shadow-sm";
  const inputCls = "w-full px-4 py-3 rounded-xl border border-brown-100 dark:border-brown-400 bg-cream-200 dark:bg-brown-600 text-brown-600 dark:text-cream-200 outline-none focus:ring-2 focus:ring-brown-300 dark:focus:ring-brown-200 transition-all placeholder-brown-200 dark:placeholder-brown-300";
  const labelCls = "block text-sm font-semibold text-brown-400 dark:text-cream-300 mb-1.5";

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-brown-500 dark:text-cream-200">Payment Proof Engine</h1>
        <p className="text-brown-300 dark:text-brown-200 text-sm mt-1">Generate a secure QR code and show it to the merchant for instant verification.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── QR Generator ── */}
        <div className={`${card} p-6 flex flex-col`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-brown-100 dark:bg-brown-400 text-brown-400 dark:text-cream-200 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-brown-500 dark:text-cream-200">Generate Payment Proof</h2>
          </div>

          <form onSubmit={handleProof} className="space-y-4 flex-1 flex flex-col">
            <div>
              <label className={labelCls}>Amount (₹) <span className="text-danger">*</span></label>
              <input type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)} className={cn(inputCls, 'font-semibold text-lg')} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Note <span className="text-brown-200 font-normal">(optional)</span></label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="e.g. Grocery payment" />
            </div>
            <button type="submit" disabled={generating}
              className="mt-auto w-full py-3 bg-brown-400 hover:bg-brown-500 disabled:opacity-60 text-cream-100 font-bold rounded-xl shadow-md active:scale-95 transition-all">
              {generating ? 'Generating...' : '🔐 Generate QR Proof'}
            </button>
          </form>

          <AnimatePresence>
            {proofData && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                className="mt-6 pt-6 border-t border-brown-100 dark:border-brown-400 overflow-hidden">
                <div className="flex flex-col items-center gap-3 text-center">
                  <p className="text-sm font-semibold text-brown-300 dark:text-brown-200 max-w-xs">Show this QR to the merchant for instant, scam-proof verification.</p>
                  <div className="p-3 bg-white rounded-2xl border-4 border-brown-300 shadow-lg">
                    <img src={proofData.qrCodeData} alt="Payment QR" className="w-40 h-40" />
                  </div>
                  <p className="text-3xl font-black text-brown-500 dark:text-cream-200">₹{proofData.details.amount}</p>
                  {note && <p className="text-sm text-brown-300 dark:text-brown-200">{note}</p>}
                  <div className="w-full bg-cream-200 dark:bg-brown-600 rounded-xl px-4 py-2.5 border border-brown-100 dark:border-brown-400">
                    <p className="text-[11px] text-brown-300 dark:text-brown-300 mb-0.5 font-semibold uppercase tracking-wide">Proof Code</p>
                    <p className="text-xs font-mono text-brown-500 dark:text-cream-300 break-all">{proofData.proofLink}</p>
                  </div>
                  <button onClick={() => { setProofData(null); setAmount(''); setNote(''); }} className="text-sm text-brown-400 dark:text-warning hover:underline font-semibold">Generate another</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Scam Checker ── */}
        <div className={`${card} p-6 flex flex-col`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-cream-300 dark:bg-brown-400 text-brown-400 dark:text-cream-200 rounded-xl">
              <FileSearch className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-brown-500 dark:text-cream-200">Scam Message Checker</h2>
          </div>

          <form onSubmit={handleScam} className="flex-1 flex flex-col space-y-4">
            <div className="flex-1 flex flex-col">
              <label className={labelCls}>Paste SMS / message to check</label>
              <textarea rows={5} value={scamText} onChange={e => setScamText(e.target.value)} className={cn(inputCls, 'resize-none flex-1 text-sm')} placeholder="Dear customer, your account has been blocked. Send OTP to verify..." />
            </div>
            <button type="submit" disabled={checking}
              className="w-full py-3 bg-brown-300 hover:bg-brown-400 disabled:opacity-60 text-cream-100 font-bold rounded-xl shadow-md active:scale-95 transition-all">
              {checking ? 'Analyzing...' : '🔍 Check for Scam'}
            </button>
          </form>

          <AnimatePresence>
            {scamResult && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                className={cn('mt-4 p-4 rounded-xl border flex items-start gap-3',
                  scamResult.result === 'Safe'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800')}>
                {scamResult.result === 'Safe'
                  ? <ShieldCheck className="w-6 h-6 text-success shrink-0 mt-0.5" />
                  : <ShieldAlert className="w-6 h-6 text-danger shrink-0 mt-0.5" />}
                <div>
                  <p className={cn('font-bold text-sm', scamResult.result === 'Safe' ? 'text-success' : 'text-danger')}>{scamResult.result}</p>
                  <p className="text-xs text-brown-400 dark:text-brown-200 mt-1 leading-relaxed">{scamResult.message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className={`${card} p-6`}>
        <h2 className="text-lg font-bold text-brown-500 dark:text-cream-200 mb-5">Recent Transactions</h2>
        {timeline.length === 0
          ? <p className="text-brown-200 dark:text-brown-400 text-sm text-center py-8">No recent transactions.</p>
          : (
            <div className="space-y-3">
              {timeline.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .06 }}
                  className="flex items-center gap-4 p-3.5 bg-cream-200 dark:bg-brown-600 rounded-xl border border-brown-100 dark:border-brown-400">
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center border-2 bg-cream-100 dark:bg-brown-500 shrink-0',
                    item.status === 'verified' ? 'border-success' : 'border-warning')}>
                    {item.status === 'verified'
                      ? <CheckCircle2 className="w-4 h-4 text-success" />
                      : <Clock className="w-4 h-4 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-brown-500 dark:text-cream-200">₹{item.amount}</div>
                    <div className="text-xs text-brown-300 dark:text-brown-200 truncate">{item.name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn('text-xs font-bold uppercase', item.status === 'verified' ? 'text-success' : 'text-warning')}>{item.status}</div>
                    <div className="text-[11px] text-brown-200 dark:text-brown-300 font-mono mt-0.5">{new Date(item.time).toLocaleTimeString()}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
