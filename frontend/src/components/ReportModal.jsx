import { motion } from 'framer-motion';
import { X, Download, Share2, FileText, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function ReportModal({ onClose, metrics, addToast }) {
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsGenerating(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = () => {
    addToast("Report downloaded successfully as PDF.", "success");
    onClose();
  };

  const handleShare = () => {
    addToast("Report shared securely with Accountant.", "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Summary Report</h2>
              <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 text-sm font-medium animate-pulse">Compiling metrics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold">Report successfully generated.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-center">
                  <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Total</p>
                  <p className="text-2xl font-black text-slate-800">{metrics.total}</p>
                </div>
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                  <p className="text-xs text-green-600 font-semibold uppercase mb-1">Verified</p>
                  <p className="text-2xl font-black text-green-700">{metrics.verified}</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                  <p className="text-xs text-amber-600 font-semibold uppercase mb-1">Pending</p>
                  <p className="text-2xl font-black text-amber-600">{metrics.pending}</p>
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                  <p className="text-xs text-red-500 font-semibold uppercase mb-1">Failed</p>
                  <p className="text-2xl font-black text-red-600">{metrics.failed}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isGenerating && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
            <button 
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button 
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
