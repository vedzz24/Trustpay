import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, FileSearch, ShieldCheck, ShieldAlert, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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
      .then(r => setTimeline((r.payments || []).slice(0, 5)))
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

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/40 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-primary-500/50 transition-all font-medium backdrop-blur-sm";
  const labelCls = "block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1.5 ml-1";

  // Animation Variants
  const containerVars = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <motion.div variants={itemVars} className="mb-2">
        <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400">Payment Engine</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Generate a secure QR proof or verify suspicious messages.</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── QR Generator ── */}
        <motion.div variants={itemVars} className="glass-card rounded-[2rem] p-6 lg:p-8 flex flex-col relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div className="p-3 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-500/20">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Secure Payment QR</h2>
          </div>

          <form onSubmit={handleProof} className="space-y-4 relative z-10">
            <div>
              <label className={labelCls}>Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)} 
                  className={cn(inputCls, 'pl-8 font-black text-lg')} placeholder="0" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Note <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="text" value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="e.g. Grocery bill" />
            </div>
            <button type="submit" disabled={generating}
              className="mt-2 w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-60 text-white font-black rounded-xl shadow-lg shadow-primary-500/25 active:scale-[0.98] transition-all">
              {generating ? 'Processing...' : 'Generate Secure QR'}
            </button>
          </form>

          <AnimatePresence>
            {proofData && (
              <motion.div initial={{ opacity:0, height:0, scale: 0.95 }} animate={{ opacity:1, height:'auto', scale: 1 }} exit={{ opacity:0, height:0, scale: 0.95 }}
                className="mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-700/50 overflow-hidden relative z-10">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <img src={proofData.qrCodeData} alt="Payment QR" className="w-48 h-48" />
                  </div>
                  
                  <div>
                    <p className="text-4xl font-black text-slate-800 dark:text-white">₹{proofData.details.amount}</p>
                    {note && <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{note}</p>}
                  </div>

                  <div className="w-full bg-slate-50 dark:bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-1">Proof Identifier</p>
                    <p className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 break-all">{proofData.proofLink}</p>
                  </div>
                  
                  <button onClick={() => { setProofData(null); setAmount(''); setNote(''); }} 
                    className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-bold underline decoration-2 underline-offset-4 decoration-primary-500/30 transition-colors">
                    Reset & Generate Another
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Scam Checker & Timeline ── */}
        <div className="space-y-6 flex flex-col">
          <motion.div variants={itemVars} className="glass-card rounded-[2rem] p-6 lg:p-8 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="p-3 bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-400 rounded-2xl shadow-sm border border-accent-100 dark:border-accent-500/20">
                <FileSearch className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Fraud Analyzer</h2>
            </div>

            <form onSubmit={handleScam} className="flex flex-col space-y-4 relative z-10">
              <textarea rows={4} value={scamText} onChange={e => setScamText(e.target.value)} 
                className={cn(inputCls, 'resize-none text-sm')} placeholder="Paste unusual SMS or WhatsApp message here..." />
              
              <button type="submit" disabled={checking}
                className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-60 text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all">
                {checking ? 'Analyzing Content...' : 'Verify Message'}
              </button>
            </form>

            <AnimatePresence>
              {scamResult && (
                <motion.div initial={{ opacity:0, y:-10, scale: 0.95 }} animate={{ opacity:1, y:0, scale: 1 }}
                  className={cn('mt-6 p-5 rounded-2xl border flex items-start gap-4 shadow-sm relative z-10',
                    scamResult.result === 'Safe'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20')}>
                  
                  <div className={cn("p-2 rounded-xl shrink-0", scamResult.result === 'Safe' ? "bg-emerald-200/50 dark:bg-emerald-500/20" : "bg-red-200/50 dark:bg-red-500/20")}>
                    {scamResult.result === 'Safe'
                      ? <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      : <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />}
                  </div>
                  
                  <div>
                    <h3 className={cn('font-black text-sm mb-1', scamResult.result === 'Safe' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>{scamResult.result.toUpperCase()}</h3>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{scamResult.message}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Timeline ── */}
          <motion.div variants={itemVars} className="glass-card rounded-[2rem] p-6 lg:p-8 flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Recent Activity</h2>
            </div>
            
            {timeline.length === 0
              ? <div className="py-10 text-center flex flex-col items-center justify-center opacity-50">
                  <AlertCircle className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No recent transactions</p>
                </div>
              : (
                <div className="space-y-3">
                  {timeline.map((item, i) => (
                    <motion.div key={item.id} variants={itemVars}
                      className="group flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 transition-colors">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black/5',
                        item.status === 'verified' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400')}>
                        {item.status === 'verified' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-slate-800 dark:text-slate-100 text-sm">₹{item.amount.toLocaleString('en-IN')}</div>
                        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">{item.name}</div>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <div className={cn('text-[10px] font-black tracking-wider uppercase', 
                          item.status === 'verified' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                          {item.status}
                        </div>
                        <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-1">
                          {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
