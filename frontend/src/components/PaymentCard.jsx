import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldOff, Clock, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS = {
  verified:   { Icon: ShieldCheck, badge: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', accent: 'border-l-emerald-500' },
  suspicious: { Icon: ShieldAlert, badge: 'text-red-500 bg-red-500/10 border-red-500/20', accent: 'border-l-red-500' },
  unmatched:  { Icon: ShieldOff,   badge: 'text-red-400 bg-red-400/10 border-red-400/20', accent: 'border-l-red-400' },
  pending:    { Icon: Clock,       badge: 'text-amber-500 bg-amber-500/10 border-amber-500/20', accent: 'border-l-amber-500' },
};

export default function PaymentCard({ payment, onVerify, onFlag }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS[payment.status] || STATUS.unmatched;
  const secs = Math.floor((Date.now() - payment.time) / 1000);
  const timeAgo = secs < 60 ? `${Math.max(secs, 0)}s ago` : `${Math.floor(secs / 60)}m ago`;

  const formattedTime = new Date(payment.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }} transition={{ duration: .2 }}
      className={cn(
        'bg-white/70 dark:bg-slate-900/35 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/60 shadow-sm',
        'border-l-4', cfg.accent,
        'overflow-hidden transition-all'
      )}>
      
      <div className="flex items-center justify-between p-4 gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={cn('p-2.5 rounded-xl border shrink-0', cfg.badge)}>
            <cfg.Icon className="w-5 h-5" />
          </div>
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-lg text-slate-800 dark:text-slate-100">₹{payment.amount.toLocaleString()}</span>
              <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border', cfg.badge)}>
                {payment.status}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate font-medium">
              <span className="font-bold text-slate-700 dark:text-slate-200">{payment.name}</span>
              <span className="mx-1.5 opacity-30">·</span>
              {timeAgo} <span className="opacity-30">·</span> <span className="font-mono text-[10px] text-slate-400">{payment.method}</span>
            </p>
            
            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 truncate">
              Ref ID: <span className="font-semibold text-slate-650 dark:text-slate-450">{payment.txnId}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {payment.status !== 'verified' && (
            <button onClick={() => onVerify(payment)}
              className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wide bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl shadow-md transition-all active:scale-95">
              Verify
            </button>
          )}
          {payment.status !== 'suspicious' && payment.status !== 'verified' && (
            <button onClick={() => onFlag(payment)}
              className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wide bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/20 transition-all hidden sm:block">
              Flag
            </button>
          )}
          
          <button onClick={() => setExpanded(!expanded)} 
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Cryptographic Audit Section */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-200/50 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 px-5 py-4 space-y-3 font-mono text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
            <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary-500" /> Audit Credentials
              </span>
              <span className="text-slate-400 font-semibold">{formattedTime}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="font-black text-slate-400 block mb-0.5">PAYMENT SIGNATURE HASH (SHA-256)</span>
                <span className="text-primary-600 dark:text-primary-400 break-all select-all font-semibold">{payment.hash || 'N/A (Smart Matched / Manual)'}</span>
              </div>
              <div>
                <span className="font-black text-slate-400 block mb-0.5">VERIFICATION DECRYPT KEY</span>
                <span className="break-all select-all text-slate-600 dark:text-slate-350">{payment.proofLink || 'N/A'}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
