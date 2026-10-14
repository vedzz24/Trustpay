import { useState, useEffect } from 'react';
import { AlertOctagon, ShieldAlert, Clock } from 'lucide-react';

const shell = 'fixed inset-0 z-[100] grid place-items-center bg-red-950/90 p-4 backdrop-blur-md overflow-y-auto';
const card = 'w-full max-w-lg rounded-2xl border-2 border-red-500 bg-white dark:bg-[#1a1c1e] p-6 sm:p-8 shadow-2xl relative overflow-hidden';

export default function CriticalRiskModal({ result, onAcknowledge }) {
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!result || result.riskLevel !== 'CRITICAL') return null;

  return (
    <div className={shell} role="dialog" aria-modal="true" aria-labelledby="critical-risk-title">
      <div className={card}>
        <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
        <div className="flex flex-col items-center text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-red-100 dark:bg-red-500/20 text-red-600">
            <AlertOctagon className="h-10 w-10 animate-pulse" />
          </div>
          
          <h2 id="critical-risk-title" className="mt-6 text-2xl font-black uppercase tracking-wider text-red-600 dark:text-red-500">
            Critical Risk Detected
          </h2>
          
          <p className="mt-3 text-slate-600 dark:text-slate-300 font-bold">
            GuardX has blocked this action. The detected activity matches patterns of known severe fraud or financial compromise.
          </p>
        </div>

        <div className="mt-8 rounded-xl bg-red-50 dark:bg-red-950/30 p-5 border border-red-100 dark:border-red-900/50">
          <h3 className="flex items-center gap-2 font-black uppercase tracking-wider text-red-700 dark:text-red-400 text-sm mb-4">
            <ShieldAlert className="h-4 w-4" />
            Security Analysis
          </h3>
          <ul className="space-y-3">
            {result.reasons?.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-red-900 dark:text-red-200">
                <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          {countdown > 0 ? (
            <button
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-200 dark:bg-slate-800 px-4 py-4 font-bold uppercase tracking-wider text-slate-500 transition-colors"
            >
              <Clock className="h-5 w-5 animate-pulse" />
              Mandatory Review ({countdown}s)
            </button>
          ) : (
            <button
              onClick={onAcknowledge}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-4 font-bold uppercase tracking-wider text-white transition-all hover:-translate-y-0.5 hover:shadow-lg shadow-red-600/25 active:translate-y-0"
            >
              Acknowledge Warning
            </button>
          )}
          <p className="mt-4 text-center text-xs text-slate-500">
            Guardian alerts have been dispatched. Do not proceed with this transaction.
          </p>
        </div>
      </div>
    </div>
  );
}
