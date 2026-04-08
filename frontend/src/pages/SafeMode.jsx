import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Volume2, Phone, Search, AlertTriangle,
  QrCode, Clock, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { submitFamilyRequest, pollFamilyStatus, checkScam } from '../utils/api';
import { cn } from '../utils/cn';

const THRESHOLD = 2500; // ₹ above which family approval is required

/*
  Flow:
  1. User clicks "Scan QR" → a small modal asks for amount + note.
  2. If amount < THRESHOLD   → proceed directly (approved on device).
  3. If amount >= THRESHOLD  → POST to /api/family/request → backend stores it.
     Elderly screen shows "Waiting for family approval..." and polls /api/family/status/:id.
  4. Family member opens http://localhost:5173/family in another tab/device
     → sees the request → Approve or Reject.
  5. Poll gets the response → elderly screen shows success or rejection.
*/

export default function SafeMode({ addToast, user }) {
  // ── Scan QR modal state ──────────────────────────────────────────────────
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAmount, setScanAmount]       = useState('');
  const [scanNote, setScanNote]           = useState('');
  const [submitting, setSubmitting]       = useState(false);

  // ── Waiting / polling state ──────────────────────────────────────────────
  const [waitingFor, setWaitingFor]     = useState(null); // { requestId, amount }
  const [approvalResult, setApproval]   = useState(null); // 'approved' | 'rejected'
  const pollRef                         = useRef(null);

  // ── Scam checker state ───────────────────────────────────────────────────
  const [scamText, setScamText]     = useState('');
  const [scamResult, setScamResult] = useState(null);
  const [checking, setChecking]     = useState(false);

  // ── Cleanup polling on unmount ───────────────────────────────────────────
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // Start polling after a family request is submitted
  const startPolling = (requestId, amount) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await pollFamilyStatus(requestId);
        if (res.status === 'approved') {
          clearInterval(pollRef.current);
          setWaitingFor(null);
          setApproval('approved');
          addToast(`✅ Family approved ₹${amount}. Payment proceeding.`, 'success');
        } else if (res.status === 'rejected') {
          clearInterval(pollRef.current);
          setWaitingFor(null);
          setApproval('rejected');
          addToast(`❌ Family rejected the payment of ₹${amount}. Cancelled for your safety.`, 'error');
        }
        // if 'pending', keep polling
      } catch {
        // network hiccup — keep trying
      }
    }, 2000); // poll every 2 seconds
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(scanAmount);
    if (!amt || amt <= 0) return addToast('Please enter a valid amount', 'error');

    if (amt < THRESHOLD) {
      // Safe — no approval needed
      addToast(`✅ Payment of ₹${amt} approved! Proceeding safely.`, 'success');
      setShowScanModal(false);
      setScanAmount('');
      setScanNote('');
      setApproval('approved');
      return;
    }

    // Needs family approval
    setSubmitting(true);
    try {
      const res = await submitFamilyRequest(amt, scanNote, user?.name || 'Elderly User');
      if (res.success) {
        setShowScanModal(false);
        setScanAmount('');
        setScanNote('');
        setWaitingFor({ requestId: res.requestId, amount: amt });
        addToast(`Payment of ₹${amt} needs family approval. Request sent!`, 'info');
        startPolling(res.requestId, amt);
      } else {
        addToast('Could not send approval request. Try again.', 'error');
      }
    } catch {
      addToast('Cannot reach server. Check backend is running.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScamCheck = async (e) => {
    e.preventDefault();
    if (!scamText.trim()) return addToast('Paste a message to check', 'error');
    setChecking(true);
    try {
      const res = await checkScam(scamText);
      setScamResult(res);
      addToast(res.result === 'Safe' ? 'Message looks safe' : '⚠️ Possible scam!', res.result === 'Safe' ? 'success' : 'error');
    } catch { addToast('Error checking message', 'error'); }
    finally { setChecking(false); }
  };

  const speakWarning = () => {
    if (!('speechSynthesis' in window)) return addToast('Voice not supported', 'error');
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance('Warning! Never share your OTP, PIN, or password with anyone on a phone call. Banks never ask for these details. If someone is pressuring you, hang up immediately.');
    u.rate = 0.85; u.lang = 'en-IN';
    window.speechSynthesis.speak(u);
    addToast('Playing voice warning...', 'info');
  };

  const card = 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-cyan-200 rounded-2xl shadow-sm';
  const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-cyan-200 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-slate-500 transition-all placeholder-slate-300 dark:placeholder-slate-500';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* Scam Warning Banner */}
      <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-danger rounded-2xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-6 h-6 text-danger shrink-0 mt-0.5" />
        <div>
          <h2 className="font-black text-danger mb-1">⚠️ Scam Alert</h2>
          <p className="text-red-800 dark:text-red-200 text-sm font-semibold leading-relaxed">
            Never share your OTP, PIN, or password with anyone — not even someone claiming to be from the bank.
          </p>
        </div>
      </div>

      <div>
        <h1 className="text-xl font-black text-cyan-600 dark:text-slate-100">Safe Mode</h1>
        <p className="text-slate-500 dark:text-slate-300 text-sm mt-1">
          Payments above ₹{THRESHOLD.toLocaleString()} require family member approval before proceeding.
        </p>
      </div>

      {/* ── Approval Result Banner ── */}
      <AnimatePresence>
        {approvalResult && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className={cn('p-4 rounded-2xl border-2 flex items-center gap-3 font-semibold text-sm',
              approvalResult === 'approved'
                ? 'bg-green-50 dark:bg-green-900/20 border-success text-success'
                : 'bg-red-50 dark:bg-red-900/20 border-danger text-danger'
            )}>
            {approvalResult === 'approved'
              ? <><CheckCircle2 className="w-5 h-5 shrink-0" /> Payment approved by family. You may proceed safely.</>
              : <><XCircle className="w-5 h-5 shrink-0" /> Payment rejected by family. Transaction cancelled for your safety.</>}
            <button onClick={() => setApproval(null)} className="ml-auto opacity-50 hover:opacity-100 text-lg font-bold">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Waiting Banner (polls backend) ── */}
      <AnimatePresence>
        {waitingFor && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            className="p-4 rounded-2xl border-2 border-warning bg-amber-50 dark:bg-amber-900/20 flex items-start gap-3">
            <Loader2 className="w-5 h-5 text-warning shrink-0 mt-0.5 animate-spin" />
            <div>
              <p className="font-bold text-cyan-600 dark:text-slate-100 text-sm">Waiting for family approval...</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                A request for <strong>₹{waitingFor.amount}</strong> has been sent to your family member.
                Ask them to open <strong>localhost:5173/family</strong> to respond.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
          onClick={() => addToast('Check Payment feature coming soon', 'info')}
          className="flex items-center gap-3 justify-center px-4 py-3.5 bg-cyan-500 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-sm transition-all text-sm">
          <Search className="w-5 h-5" /> Check Payment
        </motion.button>

        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
          onClick={() => { setApproval(null); setShowScanModal(true); }}
          disabled={!!waitingFor}
          className="flex items-center gap-3 justify-center px-4 py-3.5 bg-cyan-500 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm transition-all text-sm">
          <QrCode className="w-5 h-5" /> Scan QR Code
        </motion.button>

        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
          onClick={() => addToast('Call checker feature coming soon', 'info')}
          className="flex items-center gap-3 justify-center px-4 py-3.5 bg-cyan-500 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-sm transition-all text-sm">
          <Phone className="w-5 h-5" /> Check a Call
        </motion.button>
      </div>

      {/* Voice + Family Alert */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }} onClick={speakWarning}
          className="flex items-center gap-3 justify-center px-4 py-3.5 bg-warning/80 hover:bg-warning text-slate-800 font-bold rounded-xl shadow-sm text-sm">
          <Volume2 className="w-5 h-5" /> Hear Voice Warning
        </motion.button>
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:.97 }}
          onClick={() => addToast('Emergency alert sent to family member!', 'success')}
          className="flex items-center gap-3 justify-center px-4 py-3.5 bg-danger hover:bg-red-700 text-white font-bold rounded-xl shadow-sm text-sm">
          <AlertTriangle className="w-5 h-5" /> Alert Family Member
        </motion.button>
      </div>

      {/* Scam Message Checker */}
      <div className={`${card} p-5`}>
        <h3 className="font-bold text-cyan-600 dark:text-slate-100 mb-3">🔍 Check a Suspicious Message</h3>
        <form onSubmit={handleScamCheck} className="space-y-3">
          <textarea rows={3} value={scamText} onChange={e => setScamText(e.target.value)}
            className={cn(inputCls, 'resize-none text-sm')}
            placeholder="Paste SMS or WhatsApp message here..." />
          <button type="submit" disabled={checking}
            className="w-full py-2.5 bg-slate-500 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all text-sm">
            {checking ? 'Analyzing...' : 'Check for Scam'}
          </button>
        </form>
        <AnimatePresence>
          {scamResult && (
            <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
              className={cn('mt-3 p-3 rounded-xl border flex items-start gap-2 text-sm',
                scamResult.result === 'Safe'
                  ? 'bg-green-50 dark:bg-green-900/20 border-success text-success'
                  : 'bg-red-50 dark:bg-red-900/20 border-danger text-danger')}>
              {scamResult.result === 'Safe' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />}
              <div>
                <strong>{scamResult.result}</strong>
                <p className="text-slate-500 dark:text-slate-300 text-xs mt-0.5">{scamResult.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tips */}
      <div className={`${card} p-5`}>
        <h3 className="font-bold text-cyan-600 dark:text-slate-100 mb-3">🛡️ Stay Safe</h3>
        <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-300">
          {[
            `Payments above ₹${THRESHOLD.toLocaleString()} automatically notify your family for approval.`,
            'Never share your OTP or PIN with anyone on a call.',
            'If someone pressures you to pay urgently, ask your family first.',
            'Only scan QR codes shown to you in person.',
            'Official bank messages come from short codes, not personal numbers.',
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-slate-500 font-bold mt-0.5">→</span> {t}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Scan QR Modal — asks for amount ── */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-[100] bg-cyan-600/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale:.92, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.92, opacity:0 }}
              className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 dark:border-cyan-200 overflow-hidden">

              <div className="h-1 bg-gradient-to-r from-warning to-cyan-500" />

              <div className="px-6 py-4 border-b border-slate-100 dark:border-cyan-200 bg-slate-50 dark:bg-slate-900">
                <h2 className="font-bold text-cyan-600 dark:text-slate-100">Scan QR Code</h2>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                  Enter the payment amount before scanning.
                </p>
              </div>

              <form onSubmit={handleScanSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-slate-200 mb-1.5">
                    Amount (₹) <span className="text-danger">*</span>
                  </label>
                  <input type="number" min="1" required value={scanAmount} onChange={e => setScanAmount(e.target.value)}
                    className={cn(inputCls, 'text-lg font-bold')} placeholder="0" autoFocus />
                  {parseFloat(scanAmount) >= THRESHOLD && (
                    <p className="text-xs text-warning font-semibold mt-1.5 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Above ₹{THRESHOLD.toLocaleString()} — family approval required
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-500 dark:text-slate-200 mb-1.5">
                    Note <span className="text-slate-300 font-normal">(optional)</span>
                  </label>
                  <input type="text" value={scanNote} onChange={e => setScanNote(e.target.value)}
                    className={inputCls} placeholder="e.g. Medicine payment" />
                </div>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => { setShowScanModal(false); setScanAmount(''); setScanNote(''); }}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-cyan-500 hover:bg-slate-200 dark:hover:bg-slate-500 text-cyan-600 dark:text-slate-100 font-semibold rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={submitting}
                    className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-500 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Proceed'}
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
