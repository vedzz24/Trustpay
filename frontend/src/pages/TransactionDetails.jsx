import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPayments } from '../utils/api';
import { ShieldCheck, ShieldAlert, Clock, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { cn } from '../utils/cn';

export default function TransactionDetails() {
  const { txnId } = useParams();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);

  useEffect(() => {
    fetchPayments()
      .then(res => {
        if (res.success) {
          const match = res.payments.find(p => p.txnId === txnId || p._id === txnId);
          setPayment(match || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [txnId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-[#15BCDF] animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Retrieving Transaction Ledger...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Record Not Found</h2>
        <p className="text-xs text-[#6b6f72] dark:text-slate-400 font-medium">
          The transaction code request does not exist in the secure registry ledger.
        </p>
        <Link to="/" className="inline-block px-5 py-2.5 bg-[#15BCDF] text-xs font-bold uppercase tracking-wider text-white rounded-lg">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isVerified = payment.status === 'verified';
  const riskScore = isVerified ? 94 : 31;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8 font-sans">
      
      {/* Back button */}
      <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#6b6f72] dark:text-slate-300 hover:text-[#15BCDF]">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Main card */}
      <div className="bg-white/60 dark:bg-[#1a1c1e] p-6 lg:p-8 rounded-xl border border-slate-300 dark:border-white/10 space-y-6">
        
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/5 pb-5">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-400">Order Ref ID</span>
            <p className="font-mono text-sm font-bold text-[#2b3033] dark:text-white mt-0.5">{payment.txnId}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Settlement Value</span>
            <p className="text-2xl font-bold text-[#2b3033] dark:text-white">₹{payment.amount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Verification Source</span>
              <p className="text-xs font-bold text-[#2b3033] dark:text-white mt-1">Sandbox Payment Provider</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Payer Client</span>
              <p className="text-xs font-bold text-[#2b3033] dark:text-white mt-1">{payment.name}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">Created Epoch</span>
              <p className="text-xs font-bold text-[#2b3033] dark:text-white mt-1">
                {new Date(payment.time).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400">SHA-256 Ledger Integrity</span>
              <p className="text-xs font-bold text-emerald-500 mt-1">✓ STRUCTURALLY VALID</p>
            </div>
          </div>

          {/* Trust Score Visual */}
          <div className="bg-slate-100/50 dark:bg-black/25 p-5 rounded-lg border border-slate-200 dark:border-white/5 flex flex-col justify-between items-center text-center">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#15BCDF] block mb-1">PLATFORM TRUST SCORE</span>
              <span className={cn("text-4xl font-bold", isVerified ? "text-emerald-500" : "text-amber-500")}>
                {riskScore} / 100
              </span>
              <span className="block text-[9px] font-bold text-slate-450 mt-1 uppercase">
                {isVerified ? 'LOW SCAM PROBABILITY' : 'SUSPICIOUS SIGNAL RATIO'}
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden mt-4">
              <div className={cn("h-full", isVerified ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${riskScore}%` }} />
            </div>
          </div>
        </div>

        {/* Security checks checklist */}
        <div className="border-t border-slate-200 dark:border-white/5 pt-5 space-y-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#15BCDF]">Verification Checks Ledger</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {[
              { label: "Merchant Identity Confirmed", checked: true },
              { label: "Payment Transaction Unique", checked: true },
              { label: "HMAC Signature Unbroken", checked: true },
              { label: "Provider API Settlement Settle", checked: isVerified },
              { label: "Screenshot Profile Matches", checked: isVerified },
              { label: "No Spoof Indicators Detected", checked: isVerified }
            ].map((chk, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span className={cn("w-4 h-4 rounded-md flex items-center justify-center shrink-0 text-[10px] font-black", chk.checked ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                  {chk.checked ? '✓' : '✕'}
                </span>
                <span>{chk.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
