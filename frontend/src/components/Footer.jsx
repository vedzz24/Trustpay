import { Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Phone } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-8 mt-auto z-10 shrink-0">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-16">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-2 cursor-pointer group w-max">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-black shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform duration-300">T</div>
              <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 tracking-tight">TrustPay</span>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xs">
              Pioneering zero-trust payment architecture. Protect your family, verify merchants instantly, and neutralize digital threats with our cryptographic infrastructure.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 px-3 py-1.5 rounded-lg w-max uppercase tracking-widest shadow-sm">
              <ShieldCheck className="w-4 h-4" /> ISO-27001 Certified System
            </div>
          </div>

          {/* Solutions Column */}
          <div className="space-y-5">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4">Solutions</h4>
            <div className="flex flex-col space-y-3">
              <Link className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-max" to="/">Secure Gateway</Link>
              <Link className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-max" to="/safe">Text Forensics Engine</Link>
              <Link className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-max" to="/analytics">Merchant Analytics</Link>
            </div>
          </div>

          {/* Resources Column */}
          <div className="space-y-5">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4">Resources</h4>
            <div className="flex flex-col space-y-3">
              <Link className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-max" to="/blog">Security Journal (Blog)</Link>
              <Link className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-max" to="/help">Help Center</Link>
              <span className="text-sm font-medium text-slate-400 opacity-50 cursor-not-allowed w-max flex items-center gap-1.5"><Lock className="w-3 h-3"/> Developer API</span>
            </div>
          </div>

          {/* Legal Column */}
          <div className="space-y-5">
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-4">Legal</h4>
            <div className="flex flex-col space-y-3">
              <Link className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-max" to="/privacy">Privacy Policy</Link>
              <Link className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-max" to="/terms">Terms of Service</Link>
              <span className="text-sm font-medium text-slate-400 opacity-50 cursor-not-allowed w-max flex items-center gap-1.5"><Lock className="w-3 h-3"/> Compliance Hub</span>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            © {currentYear} TrustPay Technologies Inc. All rights heavily secured.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer w-max group">
              <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" /> support@trustpay.tech
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer w-max group">
              <Phone className="w-4 h-4 group-hover:scale-110 transition-transform" /> 1-800-TRUST-HQ
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
