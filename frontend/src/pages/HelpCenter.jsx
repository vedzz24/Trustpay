import { motion } from 'framer-motion';
import { LifeBuoy, FileQuestion, MessageCircle, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { useState } from 'react';

export default function HelpCenter() {
  const [openQ, setOpenQ] = useState(0);

  const containerVars = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300 } } };

  const faqs = [
    { q: "How does the 'Generate QR' prove I paid?", a: "Unlike standard static QR codes, TrustPay generates dynamic, time-locked cryptographic tokens. When you mint a QR receipt, the backend signs the timestamp and amount. When the merchant scans it, the central server validates the signature, completely eliminating the chance of fake screenshot apps fooling the merchant." },
    { q: "How does the Safe Mode Guardian system work?", a: "If you attempt a transaction above your configured threshold (default ₹2,500), Safe Mode freezes the transaction and automatically pushes a temporary URL snippet to your registered family member. The transaction will pend indefinitely on your screen until they explicitly click 'Approve'." },
    { q: "Is the Scam Message Analyzer reading my private texts?", a: "No. TrustPay’s forensic analyzer does not auto-scan your inbox. You must intentionally copy and paste suspicious text into the engine. Our system then cross-references known malicious patterns (e.g., urgency flags, illegitimate UPI shortcodes)." },
    { q: "Can merchants fake matching transactions?", a: "Our proprietary 60-second temporal matching algorithm requires standard payment networks to sync precisely with the user's terminal clock. If multiple payments collide, the system flags it as 'Suspicious' and forces manual ID verification." }
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="max-w-4xl mx-auto px-4 py-12 flex flex-col min-h-screen space-y-12">
      
      <motion.div variants={itemVars} className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white mx-auto shadow-2xl shadow-cyan-500/30 mb-6">
          <LifeBuoy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-tight">TrustPay Help Desk</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Detailed documentation and rapid support for the world's most secure transaction architecture.</p>
      </motion.div>

      <motion.div variants={itemVars} className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors cursor-pointer group">
          <MessageCircle className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Live Chat Support</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">Connect with a certified TrustPay security architect in real-time to discuss platform queries.</p>
          <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 group-hover:translate-x-2 transition-transform uppercase tracking-widest">Open Chat <ArrowRight className="w-4 h-4"/></div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors cursor-pointer group">
          <FileQuestion className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">Platform Documentation</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">Deep dive into API references, cryptographic whitepapers, and integration guides.</p>
          <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1 group-hover:translate-x-2 transition-transform uppercase tracking-widest">Read Docs <ArrowRight className="w-4 h-4"/></div>
        </div>
      </motion.div>

      <motion.div variants={itemVars} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 lg:p-10">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-8 text-center">Frequently Requested Briefs</h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} onClick={() => setOpenQ(openQ === i ? null : i)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 cursor-pointer hover:border-cyan-500/50 transition-colors">
               <h3 className={cn("text-base font-bold transition-colors", openQ === i ? "text-cyan-600 dark:text-cyan-400" : "text-slate-800 dark:text-slate-200")}>
                 {faq.q}
               </h3>
               {openQ === i && (
                 <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="pt-4 text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 mt-4">
                   {faq.a}
                 </motion.div>
               )}
            </div>
          ))}
        </div>
      </motion.div>

    </motion.div>
  );
}
