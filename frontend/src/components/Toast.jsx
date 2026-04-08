import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map(t => {
          const cfg = {
            success: { Icon: CheckCircle,  cls: 'bg-white dark:bg-slate-800 text-success         border-green-200  dark:border-green-800' },
            error:   { Icon: AlertTriangle, cls: 'bg-white dark:bg-slate-800 text-danger          border-red-200    dark:border-red-800' },
            info:    { Icon: Info,          cls: 'bg-white dark:bg-slate-800 text-slate-500 dark:text-warning border-slate-200 dark:border-cyan-200' },
          }[t.type || 'info'];
          return (
            <motion.div key={t.id} layout initial={{ opacity:0, y:16, scale:.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:.9 }}
              className={cn('flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg pointer-events-auto', cfg.cls)}>
              <cfg.Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold flex-1 text-cyan-600 dark:text-slate-100">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100 transition-opacity ml-1">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
