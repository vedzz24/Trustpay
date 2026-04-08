import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldOff, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS = {
  verified:   { Icon: ShieldCheck, badge: 'text-success bg-green-50   dark:bg-green-900/20  border-green-200  dark:border-green-800',  accent: 'border-l-success' },
  suspicious: { Icon: ShieldAlert, badge: 'text-warning bg-amber-50   dark:bg-amber-900/20  border-amber-200  dark:border-amber-700',  accent: 'border-l-warning' },
  unmatched:  { Icon: ShieldOff,   badge: 'text-danger  bg-red-50     dark:bg-red-900/20    border-red-200    dark:border-red-800',    accent: 'border-l-danger' },
  pending:    { Icon: Clock,       badge: 'text-slate-500 bg-slate-50 dark:bg-slate-800     border-slate-100  dark:border-cyan-200',  accent: 'border-l-slate-300' },
};

export default function PaymentCard({ payment, onVerify, onFlag }) {
  const cfg     = STATUS[payment.status] || STATUS.unmatched;
  const secs    = Math.floor((Date.now() - payment.time) / 1000);
  const timeAgo = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} transition={{ duration: .2 }}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-cyan-200 shadow-sm',
        'border-l-4', cfg.accent,
        'flex items-center justify-between p-4 gap-4 hover:shadow-md transition-shadow'
      )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('p-2.5 rounded-xl border shrink-0', cfg.badge)}>
          <cfg.Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg text-slate-800 dark:text-slate-100">₹{payment.amount}</span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border', cfg.badge)}>
              {payment.status}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-0.5 truncate">
            <span className="font-semibold text-cyan-600 dark:text-slate-200">{payment.name}</span>
            <span className="mx-1.5 opacity-30">·</span>
            {timeAgo} <span className="opacity-30">·</span> <span className="font-mono text-xs">{payment.method}</span>
          </p>
          <p className="text-[11px] font-mono text-slate-300 dark:text-slate-500 mt-0.5 truncate">TXN: {payment.id}</p>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {payment.status !== 'verified' && (
          <button onClick={() => onVerify(payment)}
            className="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-cyan-500 text-slate-500 dark:text-slate-100 border border-slate-200 dark:border-slate-300 hover:bg-cyan-500 hover:text-white rounded-xl transition-all">
            Mark Verified
          </button>
        )}
        {payment.status !== 'suspicious' && (
          <button onClick={() => onFlag(payment)}
            className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-danger border border-slate-100 dark:border-cyan-200 hover:bg-red-50 rounded-xl transition-all hidden sm:block">
            Flag
          </button>
        )}
      </div>
    </motion.div>
  );
}
