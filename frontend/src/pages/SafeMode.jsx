import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Volume2, Phone, Search, AlertTriangle,
  QrCode, Clock, CheckCircle2, XCircle, Loader2, UploadCloud, ImageIcon, Lock, ArrowRight, ShieldCheck, FileSearch, Mic, Activity, Trash2
} from 'lucide-react';
import { submitFamilyRequest, pollFamilyStatus, fetchOtpAlerts } from '../utils/api';
import { cn } from '../utils/cn';

const THRESHOLD = 2500;

export default function SafeMode({ addToast, user }) {
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAmount, setScanAmount] = useState('');
  const [scanNote, setScanNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [waitingFor, setWaitingFor] = useState(null);
  const [approvalResult, setApproval] = useState(null);
  const pollRef = useRef(null);
  const [otpLogs, setOtpLogs] = useState([]);

  useEffect(() => {
    loadOtpHistory();

    const eventSource = new EventSource('http://localhost:5000/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'family_alert_updated') {
          setWaitingFor(curr => {
            if (curr && curr.requestId === data._id) {
              setApproval(data.status);
              if (data.status === 'approved') {
                addToast(`✅ Guardian approved ₹${curr.amount}.`, 'success');
              } else if (data.status === 'rejected') {
                addToast(`❌ Guardian rejected ₹${curr.amount}.`, 'error');
              }
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
              return null;
            }
            return curr;
          });
        }
      } catch (err) {
        console.error('Error parsing SSE event in GuardianMode:', err);
      }
    };

    return () => {
      eventSource.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const loadOtpHistory = async () => {
    try {
      const res = await fetchOtpAlerts();
      if (res.success) {
        setOtpLogs(res.alerts || []);
      }
    } catch {}
  };

  const startPolling = (requestId, amount) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await pollFamilyStatus(requestId);
        if (res.status === 'approved') {
          clearInterval(pollRef.current);
          setWaitingFor(null);
          setApproval('approved');
        } else if (res.status === 'rejected') {
          clearInterval(pollRef.current);
          setWaitingFor(null);
          setApproval('rejected');
        }
      } catch {}
    }, 2000);
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(scanAmount);
    if (!amt || amt <= 0) return addToast('Enter valid amount', 'error');

    if (amt < THRESHOLD) {
      addToast(`✅ Payment of ₹${amt} authorized directly.`, 'success');
      setShowScanModal(false); setScanAmount(''); setScanNote(''); setApproval('approved');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitFamilyRequest(amt, scanNote, user?.name || 'User');
      if (res.success) {
        setShowScanModal(false); setScanAmount(''); setScanNote('');
        setWaitingFor({ requestId: res.requestId, amount: amt });
        addToast(`Guarded transfer triggers approval alert.`, 'info');
        startPolling(res.requestId, amt);
      }
    } catch { addToast('Error sending approval code request.', 'error'); }
    finally { setSubmitting(false); }
  };

  const inputCls = "w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 text-[#2b3033] dark:text-white outline-none focus:ring-1 focus:ring-[#15BCDF]";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8 font-sans min-h-screen">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">GUARDIAN MODE PROTECTION</h1>
          <p className="text-sm text-[#6b6f72] dark:text-slate-400 font-medium mt-1">
            Configure transaction limits requiring family approval flags before execution.
          </p>
        </div>

        <div className="shrink-0">
          {(approvalResult || waitingFor) ? (
            <div className={cn("px-4 py-2 rounded-lg text-xs font-bold border", approvalResult === 'approved' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20")}>
              {approvalResult === 'approved' && 'Guardian Approved Transfer'}
              {approvalResult === 'rejected' && 'Guardian Blocked Transfer'}
              {waitingFor && `Awaiting approval for ₹${waitingFor.amount}`}
            </div>
          ) : (
            <button onClick={() => setShowScanModal(true)} className="px-5 py-2.5 bg-[#15BCDF] hover:bg-[#3fd0ef] text-white font-bold uppercase text-xs tracking-wider rounded-lg transition-colors">
              Trigger Guarded Payment
            </button>
          )}
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white/60 dark:bg-[#1a1c1e] p-6 lg:p-8 rounded-xl border border-slate-300 dark:border-white/10 space-y-6">
        <div>
          <h3 className="text-base font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Protection Parameters</h3>
          <p className="text-xs text-[#6b6f72] dark:text-slate-400 font-medium mt-1">
            Manage guardian relationships, OTP flags, and threshold rules.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <span className="text-xs font-bold text-slate-550 dark:text-slate-300 uppercase">Guardian Contact</span>
            <span className="text-xs font-bold text-[#15BCDF]">Rahul (Mobile Linked)</span>
          </div>
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-3">
            <span className="text-xs font-bold text-slate-550 dark:text-slate-300 uppercase">Approval Threshold</span>
            <span className="text-xs font-bold text-[#2b3033] dark:text-white">₹{THRESHOLD}+</span>
          </div>
          <div className="flex justify-between items-center pb-3">
            <span className="text-xs font-bold text-slate-550 dark:text-slate-300 uppercase">Voice Disturbance Warning</span>
            <span className="text-xs font-bold text-emerald-500">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Distress distress alert */}
      <div className="bg-red-500/10 border border-red-500/20 p-5 rounded-xl flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        <div className="flex-1 text-xs">
          <p className="font-bold text-red-500 uppercase tracking-wider">Emergencydistress Alert</p>
          <p className="font-medium text-slate-700 dark:text-slate-300 mt-0.5">
            Send instant security threat warnings to your linked guardian.
          </p>
        </div>
        <button onClick={() => addToast('Distress ping sent to Rahul.', 'error')} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors shrink-0">
          Distress Trigger
        </button>
      </div>

      {/* Guarded transfer modal */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 p-4 backdrop-blur-md flex items-center justify-center">
            <motion.div initial={{ scale: 0.98, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#F2F1F0] dark:bg-[#1a1c1e] w-full max-w-sm rounded-xl border border-slate-300 dark:border-white/10 p-6 text-[#2b3033] dark:text-white">
              <h3 className="text-base font-bold uppercase tracking-wider mb-4">Trigger Guarded Payment</h3>
              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6b6f72] dark:text-slate-400 mb-1">Payment Amount (₹)</label>
                  <input required type="number" min="1" value={scanAmount} onChange={e => setScanAmount(e.target.value)} className={inputCls} placeholder="e.g. 3000" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-widest text-[#6b6f72] dark:text-slate-400 mb-1">Order/Billing Note</label>
                  <input type="text" value={scanNote} onChange={e => setScanNote(e.target.value)} className={inputCls} placeholder="e.g. Purchase payment" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowScanModal(false)} className="flex-1 py-2.5 bg-slate-200 dark:bg-white/5 text-xs font-bold uppercase tracking-wider rounded-lg text-slate-700 dark:text-slate-300">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2.5 bg-[#15BCDF] text-xs font-bold uppercase tracking-wider rounded-lg text-white">
                    {submitting ? 'Requesting...' : 'Submit'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
