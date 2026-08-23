import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, FileSearch, ShieldCheck, ShieldAlert, Clock, ArrowRight, ShieldCheck as VerifiedIcon, ShieldX, HelpCircle, History, Lock } from 'lucide-react';
import { generateProof, fetchPayments } from '../utils/api';
import { Link } from 'react-router-dom';
import { cn } from '../utils/cn';

export default function UserMode({ addToast, user }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [proofData, setProofData] = useState(null);
  const [generating, setGen] = useState(false);
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetchPayments()
      .then(r => setTimeline((r.payments || []).slice(0, 8)))
      .catch(() => {});
  }, []);

  const handleProof = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return addToast('Enter a valid amount', 'error');
    setGen(true);
    try {
      const data = await generateProof(amount, note, user?.name);
      if (data.success) {
        setProofData(data);
        addToast('Payment QR is now dynamic and signed. Ready to scan.', 'success');
      } else {
        addToast(data.message || 'Failed to generate proof', 'error');
      }
    } catch {
      addToast('Cannot reach server.', 'error');
    } finally {
      setGen(false);
    }
  };

  const containerVars = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0 } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-sans min-h-screen">
      
      {/* Greeting Header */}
      <motion.div variants={itemVars} className="pb-6 border-b border-slate-300 dark:border-white/10">
        <h1 className="text-3xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">PAY WITH CONFIDENCE.</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">
          Welcome back, {user?.name}. Generate structurally signed payment request credentials or explore security features.
        </p>
      </motion.div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Actions */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Quick Actions Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <Link to="/fraud" className="group p-6 bg-white/60 dark:bg-[#1a1c1e] rounded-xl border border-slate-300 dark:border-white/10 hover:border-[#15BCDF] transition-all flex flex-col justify-between min-h-[160px]">
              <div className="w-10 h-10 rounded-lg bg-[#15BCDF]/10 text-[#15BCDF] flex items-center justify-center group-hover:scale-105 transition-all">
                <FileSearch className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#2b3033] dark:text-white uppercase tracking-wider flex items-center justify-between">
                  PAYMENT PROOF ANALYZER
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-[10px] text-[#6b6f72] dark:text-slate-450 mt-1 font-semibold">Inspect receipt text, font styles, and file parameters.</p>
              </div>
            </Link>

            <Link to="/fraud" className="group p-6 bg-white/60 dark:bg-[#1a1c1e] rounded-xl border border-slate-300 dark:border-white/10 hover:border-[#15BCDF] transition-all flex flex-col justify-between min-h-[160px]">
              <div className="w-10 h-10 rounded-lg bg-[#15BCDF]/10 text-[#15BCDF] flex items-center justify-center group-hover:scale-105 transition-all">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#2b3033] dark:text-white uppercase tracking-wider flex items-center justify-between">
                  SCAM MESSAGE ANALYZER
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-[10px] text-[#6b6f72] dark:text-slate-450 mt-1 font-semibold">Paste suspicious communications OTP request text files to test scams.</p>
              </div>
            </Link>

            <Link to="/safe" className="group p-6 bg-white/60 dark:bg-[#1a1c1e] rounded-xl border border-slate-300 dark:border-white/10 hover:border-[#15BCDF] transition-all flex flex-col justify-between min-h-[160px]">
              <div className="w-10 h-10 rounded-lg bg-[#15BCDF]/10 text-[#15BCDF] flex items-center justify-center group-hover:scale-105 transition-all">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#2b3033] dark:text-white uppercase tracking-wider flex items-center justify-between">
                  GUARDIAN MODE
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-[10px] text-[#6b6f72] dark:text-slate-450 mt-1 font-semibold">Configure alert limits requiring family approvals.</p>
              </div>
            </Link>

            <Link to="/security" className="group p-6 bg-white/60 dark:bg-[#1a1c1e] rounded-xl border border-slate-300 dark:border-white/10 hover:border-[#15BCDF] transition-all flex flex-col justify-between min-h-[160px]">
              <div className="w-10 h-10 rounded-lg bg-[#15BCDF]/10 text-[#15BCDF] flex items-center justify-center group-hover:scale-105 transition-all">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#2b3033] dark:text-white uppercase tracking-wider flex items-center justify-between">
                  SECURITY PLATFORM Spec
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-[10px] text-[#6b6f72] dark:text-slate-450 mt-1 font-semibold">Examine system architectures: SHA-256 signatures, PBKDF2 hashing, SSE.</p>
              </div>
            </Link>

          </div>

          {/* Secure Payment Proof QR Mint */}
          <div className="bg-white/60 dark:bg-[#1a1c1e] p-6 lg:p-8 rounded-xl border border-slate-300 dark:border-white/10 space-y-6">
            <div className="flex items-center gap-3">
              <QrCode className="w-6 h-6 text-[#15BCDF]" />
              <h2 className="text-base font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Verify TrustPay QR Generator</h2>
            </div>
            
            <form onSubmit={handleProof} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6b6f72] dark:text-slate-400 mb-1">Payment Amount (₹)</label>
                <input required type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 text-[#2b3033] dark:text-white outline-none" placeholder="Enter amount e.g. 500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#6b6f72] dark:text-slate-400 mb-1">Order Ref / Reference ID</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 text-[#2b3033] dark:text-white outline-none" placeholder="e.g. Bill TP-901" />
              </div>
              <button type="submit" disabled={generating} className="btn-chamfered sm:col-span-2 py-3.5 bg-[#15BCDF] hover:bg-[#3fd0ef] text-white font-bold uppercase text-xs tracking-wider transition-colors mt-2">
                {generating ? 'Signing Signature Payload...' : 'Mint Verified QR Request'}
              </button>
            </form>

            {proofData && (
              <div className="pt-6 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row gap-6 items-center">
                <div className="p-4 bg-white rounded-lg border border-slate-250 shrink-0 text-center">
                  <img src={proofData.qrCodeData} alt="Dynamic QR Code" className="w-36 h-36 mx-auto mix-blend-multiply" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 block mt-2">dynamic token</span>
                </div>
                <div className="space-y-3 flex-1 w-full text-xs font-semibold">
                  <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                    <span className="text-slate-400">HMAC-SHA256 Signature</span>
                    <span className="text-[#15BCDF] break-all max-w-[200px] font-mono text-[9px]">{proofData.details.hash}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2">
                    <span className="text-slate-400">Verification Source</span>
                    <span className="text-[#2b3033] dark:text-white">Sandbox Payment Provider</span>
                  </div>
                  <div className="text-[10px] text-[#6b6f72] dark:text-slate-500 pt-2 font-medium">
                    "This code generates dynamic receipt structures. Final settlement must be verified server-side."
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Ledger Feed */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white/60 dark:bg-[#1a1c1e] p-6 rounded-xl border border-slate-300 dark:border-white/10 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#15BCDF]" /> Transaction History
            </h3>

            {timeline.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6">No registry log found.</p>
            ) : (
              <div className="space-y-3">
                {timeline.map(item => (
                  <Link to={`/transaction/${item.txnId || item._id}`} key={item._id} className="block p-3 rounded-lg border border-slate-200 dark:border-white/5 hover:border-[#15BCDF] bg-slate-50/50 dark:bg-black/25 transition-all text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-bold text-[#2b3033] dark:text-white">₹{item.amount}</span>
                      <span className={cn("text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border", item.status === 'verified' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-[#6b6f72] dark:text-slate-500 font-bold">
                      <span>Ref: {item.txnId}</span>
                      <span>{new Date(item.time).toLocaleTimeString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </motion.div>
  );
}
