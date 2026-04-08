import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAnalytics } from '../utils/api';
import { 
  TrendingUp, Activity, CheckCircle2, AlertTriangle, 
  Clock, ArrowUpRight, ArrowDownRight, FileText, XCircle
} from 'lucide-react';
import ReportModal from './ReportModal';
import { cn } from '../utils/cn';

export default function MerchantAnalytics({ addToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await fetchAnalytics();
      setData(res);
    } catch (err) {
      addToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center items-center py-32">
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-xl bg-cyber-purple opacity-50 animate-pulse-glow" />
          <Activity className="w-12 h-12 text-cyber-purple animate-spin relative z-10" />
        </div>
      </div>
    );
  }

  const { metrics, hourlyData, highestPayment, lowestPayment } = data;

  const maxVolume = Math.max(...hourlyData.map(d => d.volume));
  const peakHour = hourlyData.reduce((prev, curr) => (prev.volume > curr.volume) ? prev : curr);
  const getPercent = (val) => Math.round((val / metrics.total) * 100) || 0;

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-white/20 gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">System <span className="neon-text">Overview</span></h2>
          <p className="text-sm text-cyber-cyan font-mono mt-1 tracking-wider">Metrics trending +23% upward</p>
        </div>
        <button 
          onClick={() => setShowReport(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyber-cyan to-cyber-purple text-white font-bold rounded-xl shadow-glow-cyan hover:shadow-glow-purple transition-all duration-300 active:scale-95 uppercase tracking-wide"
        >
          <FileText className="w-5 h-5" />
          <span>Compile Report</span>
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: "Total Handled", value: metrics.total, icon: Activity, color: "text-cyber-cyan", bg: "bg-cyber-cyan/10 border-cyber-cyan/30", glow: "shadow-[0_0_15px_rgba(0,245,255,0.2)]" },
          { label: "Verified Core", value: metrics.verified, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]" },
          { label: "Pending Processing", value: metrics.pending, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/30", glow: "shadow-[0_0_15px_rgba(250,204,21,0.2)]" },
          { label: "Threats Blocked", value: metrics.failed, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10 border-red-500/30", glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]" },
        ].map((card, i) => (
          <motion.div 
            key={card.label}
            initial={{ opacity: 0, y: 20, rotateX: 90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: i * 0.1, type: "spring" }}
            className={cn("glass-panel p-5 rounded-2xl flex flex-col gap-4 border group hover:scale-[1.02] transition-transform", card.glow)}
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-2.5 rounded-xl border backdrop-blur-md", card.color, card.bg)}>
                <card.icon className="w-6 h-6 drop-shadow-[0_0_5px_currentColor]" />
              </div>
            </div>
            <div>
              <h3 className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-widest">{card.value}</h3>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 opacity-80">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Peak Payment Times (Bar Chart) */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 flex flex-col relative overflow-hidden group hover:shadow-glow-purple transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/5 to-transparent z-0 pointer-events-none" />
          
          <div className="flex justify-between items-end mb-8 relative z-10">
            <div>
              <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                <Activity className="w-6 h-6 text-cyber-purple drop-shadow-[0_0_8px_rgba(107,0,255,0.8)]" />
                Network Traffic
              </h3>
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest">Surge detected around {peakHour.hour}</p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 border border-cyber-cyan/50 text-cyber-cyan rounded-md bg-cyber-cyan/10 shadow-glow-cyan">
                Peak: {peakHour.hour} [{peakHour.volume} OPS]
              </span>
            </div>
          </div>
          
          <div className="flex-1 flex items-end gap-1.5 sm:gap-3 h-56 mt-auto pt-4 border-b border-white/10 relative z-10">
            {hourlyData.map((d, i) => {
              const heightPercent = (d.volume / maxVolume) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group/bar relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-10 bg-black/90 border border-cyber-cyan text-cyber-cyan font-mono text-[10px] py-1.5 px-3 rounded shadow-glow-cyan transition-all whitespace-nowrap z-20 pointer-events-none">
                    {d.volume} OPS
                  </div>
                  
                  {/* Glowing Bar */}
                  <div className="w-full relative flex justify-center items-end" style={{height: `${heightPercent}%`}}>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: "100%" }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: i * 0.05 }}
                      className={cn(
                        "w-full rounded-t-sm transition-all duration-300 relative overflow-hidden",
                        "bg-gradient-to-t from-cyber-purple/20 hover:from-cyber-purple/50",
                        d.hour === peakHour.hour ? "to-cyber-cyan border-t-2 border-cyber-cyan shadow-glow-cyan" : "to-cyber-purple border-t border-cyber-purple/50 hover:border-cyber-cyan hover:shadow-glow-purple"
                      )}
                    >
                      {/* Inner animated scan line on the bar itself */}
                      <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent h-[10px] animate-scanline" />
                    </motion.div>
                  </div>

                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-3 -rotate-45 sm:rotate-0 origin-bottom-left whitespace-nowrap hidden md:block opacity-70">
                    {d.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown & Extremes */}
        <div className="space-y-8">
          {/* Status Breakdown Segmented Bar */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 hover:shadow-glow-cyan transition-all duration-500">
            <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight mb-6">Execution States</h3>
            
            <div className="h-4 w-full flex rounded-full overflow-hidden mb-6 bg-slate-200 dark:bg-black/50 border border-white/10 shadow-inner">
              {getPercent(metrics.verified) > 0 && <div style={{width: `${getPercent(metrics.verified)}%`}} className="bg-green-500 shadow-[0_0_10px_#10B981] relative"><div className="absolute inset-0 bg-white/20 animate-pulse-glow" /></div>}
              {getPercent(metrics.pending) > 0 && <div style={{width: `${getPercent(metrics.pending)}%`}} className="bg-yellow-400 shadow-[0_0_10px_#FACC15]" />}
              {getPercent(metrics.failed) > 0 && <div style={{width: `${getPercent(metrics.failed)}%`}} className="bg-red-500 shadow-[0_0_10px_#EF4444]" />}
            </div>
            
            <div className="space-y-4 font-mono text-xs uppercase tracking-widest">
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_#10B981]" /> Valid
                </div>
                <span className="font-bold text-white">{getPercent(metrics.verified)}% <span className="opacity-50 ml-2">[{metrics.verified}]</span></span>
              </div>
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#FACC15]" /> Awaiting
                </div>
                <span className="font-bold text-white">{getPercent(metrics.pending)}% <span className="opacity-50 ml-2">[{metrics.pending}]</span></span>
              </div>
              <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]" /> Flagged
                </div>
                <span className="font-bold text-white">{getPercent(metrics.failed)}% <span className="opacity-50 ml-2">[{metrics.failed}]</span></span>
              </div>
            </div>
          </div>

          {/* Extremes */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 hover:shadow-glow-purple transition-all duration-500">
            <h3 className="font-black text-slate-800 dark:text-slate-100 tracking-tight">Outliers Detected</h3>
            
            {highestPayment && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyber-cyan transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyber-cyan/10 text-cyber-cyan border border-cyber-cyan/30 rounded-lg group-hover:shadow-glow-cyan transition-all">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 tracking-wider line-clamp-1">{highestPayment.name || 'ANON_SOURCE'}</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">₹{highestPayment.amount}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan rounded">MAX</span>
              </div>
            )}

            {lowestPayment && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:border-cyber-purple transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/30 rounded-lg group-hover:shadow-glow-purple transition-all">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-slate-500 tracking-wider line-clamp-1">{lowestPayment.name || 'ANON_SOURCE'}</p>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">₹{lowestPayment.amount}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple rounded">MIN</span>
              </div>
            )}
          </div>

        </div>
      </div>

      <AnimatePresence>
        {showReport && (
          <ReportModal 
            onClose={() => setShowReport(false)} 
            metrics={metrics} 
            addToast={addToast} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
