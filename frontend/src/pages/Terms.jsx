import { motion } from 'framer-motion';
import { FormInput, FileSignature } from 'lucide-react';

export default function Terms() {
  const containerVars = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
  const itemVars = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1 } };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="max-w-4xl mx-auto px-4 py-12 flex flex-col min-h-screen">
      
      <motion.div variants={itemVars} className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20">
            <FileSignature className="w-6 h-6" />
          </div>
          <p className="text-sm font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">Master Service Agreement</p>
        </div>
        <h1 className="text-4xl font-black text-slate-800 dark:text-white tracking-tight mb-3">Terms of Service</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Effective Date: October 14, 2026.</p>
      </motion.div>

      <motion.div variants={itemVars} className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-black prose-headings:tracking-tight prose-a:text-cyan-600 dark:prose-a:text-cyan-400 prose-p:font-medium prose-p:text-slate-600 dark:prose-p:text-slate-300">
        <p className="text-lg">
          Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the TrustPay software, operated by TrustPay Technologies Inc. Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms.
        </p>

        <h2>1. Architecture Limitations and Liabilities</h2>
        <p>
          TrustPay provides a cryptographic signature wrapper (the "QR Engine") designed to heavily mitigate the risk of forged transactions. <strong>TrustPay does not hold, move, broker, or process actual fiat currency.</strong> We are a security verification layer overlaying your existing UPI interface. TrustPay Technologies Inc. holds zero liability for funds lost due to direct user negligence outside the purview of our platform logic.
        </p>

        <h2>2. Guardian Node Responsibilites</h2>
        <p>
          Users who voluntarily opt into "Safe Mode" and assign a Guardian agree to temporarily abdicate direct control of high-value transactions. Guardians bear sole responsibility for verifying the legitimacy of a requested transfer. TrustPay cannot forcefully execute or forcefully cancel a transaction that a Guardian has legally clicked "Approve" on.
        </p>

        <h2>3. Acceptable Use of the Forensic Analyzer</h2>
        <p>
          The TrustPay Text Forensics AI is designed to catch known scam vectors. It is strictly forbidden to:
        </p>
        <ul>
          <li>Reverse-engineer the AI endpoint logic.</li>
          <li>Bombard the text scanner with automated API requests (rate-limited at 50/minute).</li>
          <li>Input classified, top-secret government cipher text into the generic web portal.</li>
        </ul>

      </motion.div>
    </motion.div>
  );
}
