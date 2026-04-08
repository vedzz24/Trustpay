import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldOff, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

const STATUS = {
  verified:   { Icon: ShieldCheck, badge: 'text-success bg-green-50   dark:bg-green-900/20  border-green-200  dark:border-green-800',  accent: 'border-l-success' },
  suspicious: { Icon: ShieldAlert, badge: 'text-warning bg-amber-50   dark:bg-amber-900/20  border-amber-200  dark:border-amber-700',  accent: 'border-l-warning' },
  unmatched:  { Icon: ShieldOff,   badge: 'text-danger  bg-red-50     dark:bg-red-900/20    border-red-200    dark:border-red-800',    accent: 'border-l-danger' },
  pending:    { Icon: Clock,       badge: 'text-brown-300 bg-cream-200 dark:bg-brown-500     border-brown-100  dark:border-brown-400',  accent: 'border-l-brown-200' },
};

export default function PaymentCard({ payment, onVerify, onFlag }) {
  const cfg     = STATUS[payment.status] || STATUS.unmatched;
  const secs    = Math.floor((Date.now() - payment.time) / 1000);
  const timeAgo = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .97 }} transition={{ duration: .2 }}
      className={cn(
        'bg-cream-100 dark:bg-brown-500 rounded-2xl border border-brown-100 dark:border-brown-400 shadow-sm',
        'border-l-4', cfg.accent,
        'flex items-center justify-between p-4 gap-4 hover:shadow-md transition-shadow'
      )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn('p-2.5 rounded-xl border shrink-0', cfg.badge)}>
          <cfg.Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-lg text-brown-600 dark:text-cream-200">₹{payment.amount}</span>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border', cfg.badge)}>
              {payment.status}
            </span>
          </div>
          <p className="text-sm text-brown-300 dark:text-brown-200 mt-0.5 truncate">
            <span className="font-semibold text-brown-500 dark:text-cream-300">{payment.name}</span>
            <span className="mx-1.5 opacity-30">·</span>
            {timeAgo} <span className="opacity-30">·</span> <span className="font-mono text-xs">{payment.method}</span>
          </p>
          <p className="text-[11px] font-mono text-brown-200 dark:text-brown-300 mt-0.5 truncate">TXN: {payment.id}</p>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {payment.status !== 'verified' && (
          <button onClick={() => onVerify(payment)}
            className="px-3 py-1.5 text-xs font-bold bg-cream-200 dark:bg-brown-400 text-brown-400 dark:text-cream-200 border border-brown-200 dark:border-brown-300 hover:bg-brown-400 hover:text-cream-100 rounded-xl transition-all">
            Mark Verified
          </button>
        )}
        {payment.status !== 'suspicious' && (
          <button onClick={() => onFlag(payment)}
            className="px-3 py-1.5 text-xs font-bold bg-cream-100 dark:bg-brown-500 text-danger border border-brown-100 dark:border-brown-400 hover:bg-red-50 rounded-xl transition-all hidden sm:block">
            Flag
          </button>
        )}
      </div>
    </motion.div>
  );
}
