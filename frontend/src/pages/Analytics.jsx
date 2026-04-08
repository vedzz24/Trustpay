import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAnalytics } from '../utils/api';
import { Activity, CheckCircle2, Clock, XCircle, ArrowUpRight, ArrowDownRight, FileText, Download, X } from 'lucide-react';
import { cn } from '../utils/cn';

/* ── Print-to-PDF (no external libs) ── */
function downloadPDF(metrics, hourlyData) {
  const peak = hourlyData.reduce((a, b) => a.volume > b.volume ? a : b, { hour: '-', volume: 0 });
  const w = window.open('', '_blank');
  if (!w) { alert('Allow pop-ups to download the PDF.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><title>TrustPay Report</title>
  <style>
    body{font-family:Georgia,serif;padding:48px;color:#4E2F12;background:#FAF4EB}
    h1{color:#8B5E34;font-size:28px;margin:0 0 4px}
    .sub{color:#A67C5D;font-size:13px;margin-bottom:32px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:32px}
    .card{border:1px solid #C9A882;border-radius:12px;padding:20px;background:#FDF8F2}
    .card label{display:block;font-size:11px;text-transform:uppercase;color:#A67C5D;margin-bottom:8px;font-weight:700;letter-spacing:.05em}
    .card span{font-size:30px;font-weight:900}
    .green{color:#6B8E5E}.amber{color:#D9A66D}.red{color:#B86A5E}.blue{color:#8B5E34}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #EDE4D3;font-size:13px}
    th{font-weight:700;background:#FDF0E0}
    @media print{body{padding:20px}}
  </style></head><body>
  <h1>TrustPay Summary Report</h1>
  <p class="sub">Generated: ${new Date().toLocaleString('en-IN')}</p>
  <div class="grid">
    <div class="card"><label>Total</label><span class="blue">${metrics.total}</span></div>
    <div class="card"><label>Verified</label><span class="green">${metrics.verified}</span></div>
    <div class="card"><label>Pending</label><span class="amber">${metrics.pending}</span></div>
    <div class="card"><label>Failed</label><span class="red">${metrics.failed}</span></div>
  </div>
  <h2>Peak Hour: ${peak.hour} (${peak.volume} txns)</h2>
  <table><tr><th>Hour</th><th>Volume</th></tr>
  ${hourlyData.map(d => `<tr><td>${d.hour}</td><td>${d.volume}</td></tr>`).join('')}
  </table></body></html>`);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); w.close(); }, 500);
}

export default function Analytics({ addToast, readOnly = false }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setModal] = useState(false);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(() => addToast?.('Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Activity className="w-8 h-8 text-brown-300 animate-spin" />
    </div>
  );
  if (!data) return null;

  const { metrics, hourlyData, highestPayment, lowestPayment } = data;
  const maxVol = Math.max(...hourlyData.map(d => d.volume), 1);
  const peak   = hourlyData.reduce((a, b) => a.volume > b.volume ? a : b);
  const total  = metrics.total || 1;
  const pct    = v => Math.round((v / total) * 100);

  const card = "bg-cream-100 dark:bg-brown-500 border border-brown-100 dark:border-brown-400 rounded-2xl shadow-sm";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brown-100 dark:border-brown-400">
        <div>
          <h1 className="text-2xl font-black text-brown-500 dark:text-cream-200">
            {readOnly ? 'Reports' : 'Analytical Dashboard'}
          </h1>
          <p className="text-brown-300 dark:text-brown-200 text-sm mt-1">Transaction metrics and payment trends</p>
        </div>
        {!readOnly && (
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brown-400 hover:bg-brown-500 text-cream-100 font-bold rounded-xl shadow transition-all active:scale-95 shrink-0">
            <FileText className="w-4 h-4" /> 📄 Generate Summary Report
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total',     value:metrics.total,    Icon:Activity,     color:'text-brown-400', bg:'bg-brown-100 dark:bg-brown-400' },
          { label:'Completed', value:metrics.verified, Icon:CheckCircle2, color:'text-success',   bg:'bg-green-50 dark:bg-green-900/20' },
          { label:'Pending',   value:metrics.pending,  Icon:Clock,        color:'text-warning',   bg:'bg-amber-50 dark:bg-amber-900/20' },
          { label:'Failed',    value:metrics.failed,   Icon:XCircle,      color:'text-danger',    bg:'bg-red-50 dark:bg-red-900/20' },
        ].map((c, i) => (
          <motion.div key={i} initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: i * .05 }} className={`${card} p-5`}>
            <div className={cn('p-2.5 rounded-xl w-max mb-3', c.bg, c.color)}>
              <c.Icon className="w-5 h-5" />
            </div>
            <p className="text-3xl font-black text-brown-500 dark:text-cream-200">{c.value}</p>
            <p className="text-xs font-semibold text-brown-300 dark:text-brown-200 uppercase tracking-wide mt-1">{c.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar Chart */}
        <div className={`${card} p-6 lg:col-span-2`}>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-bold text-brown-500 dark:text-cream-200">Peak Payment Times</h2>
              <p className="text-sm text-brown-300 dark:text-brown-200 mt-0.5">Hourly transaction volume</p>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 bg-brown-100 dark:bg-brown-400 text-brown-400 dark:text-cream-200 rounded-lg border border-brown-200 dark:border-brown-300">
              Peak: {peak.hour}
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-48 border-b border-brown-100 dark:border-brown-400">
            {hourlyData.map((d, i) => {
              const h = Math.max((d.volume / maxVol) * 100, 2);
              const isPeak = d.hour === peak.hour;
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-brown-500 dark:bg-brown-400 text-cream-100 text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap z-10 transition-opacity pointer-events-none">
                    {d.volume}
                  </div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: .8, ease: 'easeOut', delay: i * .02 }}
                    className={cn('w-full rounded-t-md cursor-default', isPeak ? 'bg-brown-400' : 'bg-brown-200 dark:bg-brown-400/50 hover:bg-brown-300')}
                  />
                  <span className="text-[9px] text-brown-300 dark:text-brown-300 mt-1.5 hidden sm:block -rotate-45 origin-top-left translate-y-3 whitespace-nowrap">
                    {d.hour}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Breakdown */}
          <div className={`${card} p-5`}>
            <h3 className="font-bold text-brown-500 dark:text-cream-200 mb-4">Status Breakdown</h3>
            <div className="h-2.5 w-full flex rounded-full overflow-hidden bg-cream-300 dark:bg-brown-600 mb-4">
              {pct(metrics.verified) > 0 && <div style={{ width:`${pct(metrics.verified)}%` }} className="bg-success" />}
              {pct(metrics.pending)  > 0 && <div style={{ width:`${pct(metrics.pending)}%` }}  className="bg-warning" />}
              {pct(metrics.failed)   > 0 && <div style={{ width:`${pct(metrics.failed)}%` }}   className="bg-danger" />}
            </div>
            <div className="space-y-2.5 text-sm font-medium">
              {[
                { label:'Completed', val:metrics.verified, dot:'bg-success', p:pct(metrics.verified) },
                { label:'Pending',   val:metrics.pending,  dot:'bg-warning', p:pct(metrics.pending) },
                { label:'Failed',    val:metrics.failed,   dot:'bg-danger',  p:pct(metrics.failed) },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2.5 h-2.5 rounded-full', r.dot)} />
                    <span className="text-brown-400 dark:text-brown-200">{r.label}</span>
                  </div>
                  <span className="text-brown-500 dark:text-cream-200 font-bold">{r.p}% <span className="text-brown-300 font-normal">({r.val})</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Highest / Lowest */}
          <div className={`${card} p-5 space-y-3`}>
            <h3 className="font-bold text-brown-500 dark:text-cream-200">Notable Records</h3>
            {[
              { p: highestPayment, label: 'Highest', Icon: ArrowUpRight },
              { p: lowestPayment,  label: 'Lowest',  Icon: ArrowDownRight },
            ].filter(x => x.p).map(({ p: txn, label, Icon }) => (
              <div key={label} className="flex items-center justify-between p-3 bg-cream-200 dark:bg-brown-600 rounded-xl border border-brown-100 dark:border-brown-400">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-brown-100 dark:bg-brown-400 text-brown-400 dark:text-cream-200 rounded-lg">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-brown-300 dark:text-brown-200">{txn.name || 'Unknown'}</p>
                    <p className="text-sm font-bold text-brown-500 dark:text-cream-200">₹{txn.amount}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 bg-cream-100 dark:bg-brown-500 border border-brown-100 dark:border-brown-400 text-brown-300 dark:text-brown-200 rounded">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showModal && <ReportModal metrics={metrics} hourlyData={hourlyData} onClose={() => setModal(false)}
          onDownload={() => { downloadPDF(metrics, hourlyData); addToast?.('Summary Report.pdf downloaded', 'success'); }} />}
      </AnimatePresence>
    </div>
  );
}

function ReportModal({ metrics, hourlyData, onClose, onDownload }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = setTimeout(() => setReady(true), 1200); return () => clearTimeout(t); }, []);

  const card = "bg-cream-100 dark:bg-brown-500 border border-brown-100 dark:border-brown-400 rounded-2xl shadow-sm";

  return (
    <div className="fixed inset-0 z-[100] bg-brown-600/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{ scale:.9, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.9, opacity:0 }}
        className="bg-cream-100 dark:bg-brown-500 w-full max-w-lg rounded-2xl shadow-2xl border border-brown-100 dark:border-brown-400 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-brown-300 to-brown-500" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-brown-100 dark:border-brown-400 bg-cream-200 dark:bg-brown-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brown-100 dark:bg-brown-400 rounded-lg"><FileText className="w-5 h-5 text-brown-400 dark:text-cream-200" /></div>
            <div>
              <h2 className="font-bold text-brown-500 dark:text-cream-200">Summary Report</h2>
              <p className="text-xs text-brown-300 dark:text-brown-200">{new Date().toLocaleDateString('en-IN', { dateStyle:'long' })}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-brown-300 hover:text-brown-500 dark:hover:text-cream-200 text-2xl font-bold transition-colors">×</button>
        </div>

        <div className="p-6">
          {!ready ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-10 h-10 border-4 border-brown-100 dark:border-brown-400 border-t-brown-400 rounded-full animate-spin" />
              <p className="text-brown-300 dark:text-brown-200 text-sm font-medium">Compiling report...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-success border border-green-200 dark:border-green-800 p-3 rounded-xl mb-5 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" /> Report ready for download
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Total',    value:metrics.total,    cls:'text-brown-400 bg-brown-100 dark:bg-brown-400 border-brown-200 dark:border-brown-300' },
                  { label:'Verified', value:metrics.verified, cls:'text-success bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
                  { label:'Pending',  value:metrics.pending,  cls:'text-warning bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' },
                  { label:'Failed',   value:metrics.failed,   cls:'text-danger bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' },
                ].map(c => (
                  <div key={c.label} className={cn('p-4 rounded-xl border', c.cls)}>
                    <p className="text-xs font-semibold uppercase text-brown-300 dark:text-brown-200 mb-1">{c.label}</p>
                    <p className="text-2xl font-black">{c.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {ready && (
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={onDownload} className="flex-1 flex items-center justify-center gap-2 py-3 bg-brown-400 hover:bg-brown-500 text-cream-100 font-bold rounded-xl transition-all active:scale-95">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            <button onClick={onClose} className="flex-1 py-3 bg-cream-200 dark:bg-brown-400 hover:bg-cream-300 dark:hover:bg-brown-300 text-brown-500 dark:text-cream-200 font-bold rounded-xl transition-all">
              Close
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
