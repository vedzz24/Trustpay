import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, FileSearch, ShieldCheck, ShieldAlert, Clock, CheckCircle2, AlertCircle, ArrowRight, Lock } from 'lucide-react';
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

  // Modernized inputs with glass aesthetic
  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all font-medium text-sm";
  const labelCls = "block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

  // Sleek Entrance Animation
  const containerVars = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      
      {/* Background Ambient Glow (Subtle) */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-400/5 dark:bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Premium Header */}
      <motion.div variants={itemVars} className="pb-6 border-b border-slate-200/60 dark:border-slate-800/60 relative z-10">
        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight mb-1">Gateway Console</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Generate cryptographic receipts or inspect communications instantly.</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Main Workspace Column */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* ── Secure Payment Generator ── */}
          <motion.div variants={itemVars} className="group bg-white/70 dark:bg-slate-800/30 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/50 rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-hidden transition-all duration-500 hover:border-cyan-500/30">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform duration-300">
                 <QrCode className="w-5 h-5" />
               </div>
               <div>
                 <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Mint Receipt</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Secure QR Token</p>
               </div>
            </div>

            <form onSubmit={handleProof} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 <div>
                   <label className={labelCls}>Amount Value</label>
                   <div className="relative">
                     <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                     <input type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)} 
                       className={cn(inputCls, 'pl-8 text-lg font-bold')} placeholder="0" />
                   </div>
                 </div>
                 <div>
                   <label className={labelCls}>Metadata <span className="font-normal opacity-50">(optional)</span></label>
                   <input type="text" value={note} onChange={e => setNote(e.target.value)} className={inputCls} placeholder="e.g. Invoice #1042" />
                 </div>
              </div>
              
              <button type="submit" disabled={generating}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-cyan-500 dark:hover:bg-cyan-400 disabled:opacity-50 text-white dark:text-slate-950 font-bold tracking-wide text-sm rounded-xl shadow-lg shadow-cyan-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                {generating ? <span className="animate-pulse">PROCESSING TOKEN...</span> : <>GENERATE SECURE QR</>}
              </button>
            </form>

            <AnimatePresence>
              {proofData && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                  className="mt-8 pt-8 border-t border-slate-200/60 dark:border-slate-700/50 overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8 bg-slate-50/50 dark:bg-slate-900/35 p-6 lg:p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/65 shadow-inner">
                    <div className="p-4 bg-white rounded-3xl shadow-md border border-slate-150 shrink-0 flex flex-col items-center gap-3">
                      <img src={proofData.qrCodeData} alt="Payment QR" className="w-40 h-40 mix-blend-multiply" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                        Scan QR to Verify
                      </span>
                    </div>
                    
                    <div className="flex-1 space-y-4 w-full">
                      <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-3">
                        <div>
                          <p className="text-3xl font-black text-slate-800 dark:text-white">₹{proofData.details.amount.toLocaleString()}</p>
                          {note && <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mt-0.5">{note}</p>}
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" /> SIGNED
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white/40 dark:bg-slate-900/20 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Transaction ID</p>
                          <p className="font-mono font-bold text-slate-700 dark:text-slate-350 truncate">{proofData.details.txnId}</p>
                        </div>
                        <div className="bg-white/40 dark:bg-slate-900/20 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Timestamp</p>
                          <p className="font-bold text-slate-700 dark:text-slate-350">
                            {new Date(proofData.details.time).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-4 border border-slate-850 font-mono text-[11px] leading-relaxed shadow-inner">
                        <div className="flex items-center justify-between border-b border-slate-850 pb-2 mb-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-cyan-400" /> HMAC-SHA256 Signature
                          </span>
                          <span className="text-emerald-500 font-bold">Verified Integrity</span>
                        </div>
                        <p className="text-cyan-400 break-all mb-1 font-semibold">{proofData.details.hash}</p>
                        <div className="text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-850">
                          <span className="text-slate-400 font-bold">Raw Verification Token:</span>
                          <p className="text-slate-450 break-all select-all mt-0.5">{proofData.proofLink}</p>
                        </div>
                      </div>
                      
                      <button onClick={() => { setProofData(null); setAmount(''); setNote(''); }} 
                        className="text-xs font-bold text-slate-400 hover:text-primary-500 transition-colors underline decoration-slate-300 dark:decoration-slate-700 hover:decoration-primary-500 underline-offset-4">
                        Clear & Reset
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* ── Text Analyzer ── */}
          <motion.div variants={itemVars} className="group bg-white/70 dark:bg-slate-800/30 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-700/50 rounded-[2rem] p-6 lg:p-8 shadow-xl shadow-slate-200/20 dark:shadow-none transition-all duration-500 hover:border-cyan-500/30">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:scale-105 transition-transform duration-300">
                     <FileSearch className="w-5 h-5" />
                   </div>
                   <div>
                     <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Text Forensics</h2>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Threat Detection AI</p>
                   </div>
                </div>
             </div>

             <form onSubmit={handleScam} className="flex flex-col gap-4">
               <textarea rows={3} value={scamText} onChange={e => setScamText(e.target.value)} 
                 className={cn(inputCls, 'resize-none font-mono text-xs')} placeholder="Paste suspicious SMS or communications here..." />
               
               <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                 <div className="flex-1">
                   <AnimatePresence mode="popLayout">
                     {scamResult && (
                       <motion.div initial={{ opacity:0, scale: 0.95 }} animate={{ opacity:1, scale: 1 }}
                         className={cn('inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border',
                           scamResult.result === 'Safe' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                           : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400')}>
                         {scamResult.result === 'Safe' ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                         {scamResult.message}
                       </motion.div>
                     )}
                   </AnimatePresence>
                 </div>
                 <button type="submit" disabled={checking}
                   className="shrink-0 px-6 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-transparent text-slate-800 dark:text-white font-bold text-xs rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-[0.98]">
                   {checking ? 'SCANNING...' : 'EXECUTE SCAN'}
                 </button>
               </div>
             </form>
          </motion.div>
        </div>

        {/* Sidebar Column Timeline */}
        <div className="xl:col-span-4 h-full">
          <motion.div variants={itemVars} className="bg-white/50 dark:bg-slate-800/20 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/30 rounded-[2rem] p-6 shadow-sm h-full sticky top-24">
            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Activity Log</h2>
            
            {timeline.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center opacity-40">
                <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">No history</p>
              </div>
            ) : (
              <div className="space-y-1">
                {timeline.map((item, i) => (
                  <motion.div key={item.id} variants={itemVars}
                    className="group flex items-center justify-between p-3 hover:bg-white dark:hover:bg-slate-800/50 rounded-xl transition-colors cursor-default">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-transform duration-300 group-hover:scale-105',
                        item.status === 'verified' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400')}>
                        {item.status === 'verified' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight">₹{item.amount.toLocaleString()}</div>
                        <div className="text-[11px] font-medium text-slate-500 truncate max-w-[100px]">{item.name}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={cn('text-[9px] font-black tracking-widest uppercase mb-0.5', 
                        item.status === 'verified' ? 'text-emerald-500' : 'text-amber-500')}>
                        {item.status}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
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
