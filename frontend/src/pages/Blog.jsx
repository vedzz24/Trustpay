import { motion } from 'framer-motion';
import { BookOpen, Shield, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Blog() {
  const containerVars = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVars = { hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } };

  const articles = [
    {
      title: "The Rise of AI in Financial Scams",
      excerpt: "How threat actors are utilizing language models to perfectly mimic banking institutions and family members in phishing attacks, and how to spot them.",
      category: "Threat Landscape",
      icon: Cpu,
      color: "from-cyan-500 to-indigo-500",
      bgText: "bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20"
    },
    {
      title: "Anatomy of a UPI QR Fraud",
      excerpt: "Fraudsters often send a 'Receive Payment' QR code. By scanning it, you aren't receiving money, you're authorizing a direct debit from your account.",
      category: "Protocol Security",
      icon: ShieldAlert,
      color: "from-amber-500 to-orange-500",
      bgText: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
    },
    {
      title: "Building the TrustPay Cryptographic Engine",
      excerpt: "A deep dive into how TrustPay generates time-locked, signed receipt tokens to completely eliminate the possibility of forged merchant screenshots.",
      category: "Engineering",
      icon: Shield,
      color: "from-emerald-500 to-teal-500",
      bgText: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
    }
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVars} className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Blog Header */}
      <motion.div variants={itemVars} className="pb-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 flex items-center justify-center text-white dark:text-slate-900 shadow-lg shadow-slate-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Security Journal</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Insights, threat research, and protocol updates from the TrustPay engineering team.</p>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 shrink-0">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Newsletter Status</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">Subscribed √</p>
        </div>
      </motion.div>

      {/* Hero Article */}
      <motion.div variants={itemVars} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:border-cyan-500">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
          <div className="flex-1 space-y-6">
            <span className="px-3 py-1 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 text-xs font-black uppercase tracking-widest rounded-lg inline-block">Featured Report</span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white leading-tight">The 2026 Financial Threat Intelligence Directive</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed md:text-lg">TrustPay's annual review of digital payments infrastructure, focusing heavily on social engineering vulnerabilities, automated bot nets, and how dynamic tokens are actively killing standard static-QR invoice scams.</p>
            <button className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold tracking-wide uppercase text-sm group-hover:underline decoration-2 underline-offset-4">
              Read Full Report <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="w-full md:w-1/3 aspect-square rounded-3xl bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
             <Cpu className="w-20 h-20 text-slate-300 dark:text-slate-600" />
          </div>
        </div>
      </motion.div>

      {/* Grid of Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article, index) => {
          const Icon = article.icon;
          return (
            <motion.div key={index} variants={itemVars} className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${article.color} flex items-center justify-center text-white shadow-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className={cn("px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border", article.bgText)}>
                  {article.category}
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 group-hover:text-cyan-500 transition-colors">{article.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-6 flex-1">{article.excerpt}</p>
              
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
                <span>3 min read</span>
                <ArrowRight className="w-4 h-4 group-hover:text-cyan-500 transition-colors group-hover:translate-x-1" />
              </div>
            </motion.div>
          )
        })}
      </div>

    </motion.div>
  );
}
