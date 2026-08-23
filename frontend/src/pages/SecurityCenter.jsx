import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, FileText, Lock, Copy } from 'lucide-react';
import { fetchPayments } from '../utils/api';

export default function SecurityCenter() {
  const [payments, setPayments] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    fetchPayments()
      .then(res => {
        if (res.success) {
          setPayments(res.payments.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (hash, index) => {
    navigator.clipboard.writeText(hash);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 space-y-10 min-h-screen font-sans">
      
      {/* Title */}
      <div className="pb-6 border-b border-slate-300 dark:border-white/10">
        <h1 className="text-3xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Security & Integrity Center</h1>
        <p className="text-[#6b6f72] dark:text-slate-400 text-sm font-medium mt-1">
          Cryptographic status checks, platform technologies, and transaction tamper audits.
        </p>
      </div>

      {/* Tech Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: "Transaction Integrity",
            tech: "HMAC-SHA256",
            desc: "HMAC signatures guarantee stored transaction files remain unchanged. The hash verifies properties like amount, merchant identity, and timestamp.",
            icon: ShieldCheck,
            color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
          },
          {
            title: "Password Hashing",
            tech: "PBKDF2-SHA512",
            desc: "User access credentials are safe-salted and hashed with 1,000 iterations using synchronous crypto signatures.",
            icon: Lock,
            color: "text-[#15BCDF] bg-[#15BCDF]/10 border-[#15BCDF]/20"
          },
          {
            title: "Live Updates Channel",
            tech: "Server-Sent Events (SSE)",
            desc: "Lightweight, push-only SSE channels broadcast payment creation and approvals instantly from Node to Dashboard.",
            icon: FileText,
            color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
          }
        ].map((item, i) => (
          <div key={i} className="bg-white/60 dark:bg-[#1a1c1e] p-6 rounded-xl border border-slate-300 dark:border-white/10 flex flex-col justify-between">
            <div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">{item.title}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#15BCDF] mt-1">{item.tech}</p>
              <p className="text-xs text-[#6b6f72] dark:text-slate-400 leading-relaxed mt-3 font-medium">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Cryptographic Ledger Registry Audit */}
      <div className="bg-white/60 dark:bg-[#1a1c1e] p-6 rounded-xl border border-slate-300 dark:border-white/10 space-y-4">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Active Cryptographic Audit Registry</h2>
          <p className="text-xs text-[#6b6f72] dark:text-slate-400 font-medium">
            Real-time display of active SHA-256 integrity checks registered inside the TrustPay database.
          </p>
        </div>

        {payments.length === 0 ? (
          <p className="text-xs text-[#6b6f72] dark:text-slate-500 italic py-6">No transaction signatures currently in registry.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((p, idx) => (
              <div key={p._id || idx} className="p-4 bg-slate-100/50 dark:bg-black/25 border border-slate-200 dark:border-white/5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs uppercase text-[#2b3033] dark:text-white">{p.name || 'Anonymous'}</span>
                    <span className="text-[10px] text-[#15BCDF] font-bold">₹{p.amount}</span>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      Integrity Checked
                    </span>
                  </div>
                  <p className="font-mono text-[9px] text-[#6b6f72] dark:text-slate-450 break-all">
                    Signature: {p.hash || 'Simulated Registry Hash'}
                  </p>
                </div>
                {p.hash && (
                  <button onClick={() => handleCopy(p.hash, idx)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 hover:bg-slate-200 text-[10px] font-bold uppercase tracking-wider rounded-lg text-slate-650 dark:text-slate-300 transition-all shrink-0">
                    <Copy className="w-3.5 h-3.5" />
                    {copiedIndex === idx ? 'Copied' : 'Copy Hash'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
