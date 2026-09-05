import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Database, Lock } from 'lucide-react';

export default function Privacy() {
  const containerVars = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const itemVars = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1 } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="max-w-4xl mx-auto px-4 py-12 flex flex-col min-h-screen">
      
      <motion.div variants={itemVars} className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">ISO-27001 Compliant</p>
        </div>
        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-3">Privacy Framework Directive</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Effective Date: October 14, 2026. Last Audited: Today.</p>
      </motion.div>

      <motion.div variants={itemVars} className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-cyan-600 dark:prose-a:text-cyan-400 prose-p:font-medium prose-p:text-slate-600 dark:prose-p:text-slate-300">
        <p className="text-lg">
          TrustPay Technologies Inc. ("TrustPay", "we", "our") engineers software under a strict zero-knowledge trust model. Our objective is to secure digital commerce while harvesting an absolute minimum footprint of Personally Identifiable Information (PII).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10 not-prose">
          <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Database className="w-6 h-6 text-cyan-500 mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Data Isolation</h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All payment logs are strictly isolated. Cryptographic hashes cannot be reverse-engineered to expose account balances to third parties.</p>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
            <Lock className="w-6 h-6 text-cyan-500 mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Zero Sale Mandate</h3>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">We do not, and will never, sell or broker your transaction telemetry to advertisement networks.</p>
          </div>
        </div>

        <h2>Section 1: Telemetry and Capture</h2>
        <p>
          To maintain the operational capability of the <strong>TrustPay Safe Mode</strong> engine, we temporarily ingest:
        </p>
        <ul>
          <li><strong>Temporal Execution Stamps:</strong> The exact millisecond a QR token is requested versus verified.</li>
          <li><strong>Forensic Payloads:</strong> Text strings explicitly submitted by you to the "Message Analyzer." These strings are retained in volatile RAM for 3.5 seconds before total deletion.</li>
        </ul>

        <h2>Section 2: Guardian Protection</h2>
        <p>
          When an authenticated safety check produces a HIGH or CRITICAL result and an active GuardianLink exists, TrustPay creates a limited safety alert for the linked Guardian. Alerts exclude passwords, OTPs, UPI PINs, banking credentials, and unnecessary raw message content.
        </p>

        <div className="p-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl my-8 not-prose">
          <h4 className="flex items-center gap-2 text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-2"><ShieldAlert className="w-4 h-4"/> Law Enforcement Clause</h4>
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
            While TrustPay protects user integrity, we stringently comply with verified, warrant-backed requests from domestic and international financial task forces targeting digital cybercrime rings.
          </p>
        </div>

      </motion.div>
    </motion.div>
  );
}
