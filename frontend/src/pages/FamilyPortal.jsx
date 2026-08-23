import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { fetchFamilyPending, familyApprove, familyReject } from '../utils/api';
import { cn } from '../utils/cn';

/*
  Family Portal — simulates a family member's phone/device.
  Accessible at /family (no login required for ease of demo).
  Polls the backend every 3 seconds for a pending approval request.
  When one arrives, family can Approve or Reject.
*/
export default function FamilyPortal() {
  const [request, setRequest]   = useState(null);  // pending request object
  const [loading, setLoading]   = useState(true);
  const [result, setResult]     = useState(null);   // 'approved' | 'rejected'
  const [acting, setActing]     = useState(false);  // approve/reject in progress

  // Connect to real-time stream with fallback polling
  useEffect(() => {
    checkPending(); // immediate check

    const eventSource = new EventSource('http://localhost:5000/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'family_alert_created') {
          setRequest(data);
          setResult(null); // Clear any previous resolution banners
        } else if (type === 'family_alert_updated') {
          setRequest(prev => {
            if (prev && prev._id === data._id) {
              setResult(data.status);
              return null; // request resolved
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error parsing SSE event in FamilyPortal:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('FamilyPortal SSE connection failed. Polling fallback active.');
    };

    const interval = setInterval(checkPending, 6000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, []);

  const checkPending = async () => {
    try {
      const res = await fetchFamilyPending();
      if (res.pending && res.request) {
        setRequest(res.request);
      } else {
        // No pending request — only clear local state if we haven't acted yet
        setRequest(prev => {
          // If family already acted, don't clear so they see the result
          if (result) return prev;
          return null;
        });
      }
    } catch {
      // Server not reachable — keep waiting silently
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setActing(true);
    try {
      await familyApprove();
      setResult('approved');
      setRequest(null);
    } catch { alert('Failed to approve. Try again.'); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    setActing(true);
    try {
      await familyReject();
      setResult('rejected');
      setRequest(null);
    } catch { alert('Failed to reject. Try again.'); }
    finally { setActing(false); }
  };

  const reset = () => { setResult(null); setRequest(null); };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      
      {/* Background decoration blobs (ice blue organic shapes) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-50 dark:bg-blue-950/10 blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[60%] rounded-full bg-cyan-50/40 dark:bg-cyan-950/10 blur-3xl pointer-events-none z-0" />
      
      {/* Plant Left SVG */}
      <div className="fixed bottom-0 left-0 pointer-events-none opacity-20 dark:opacity-10 z-0">
        <svg viewBox="0 0 200 200" className="w-36 h-36 lg:w-44 lg:h-44">
          <path d="M100,150 Q70,90 85,30 Q90,90 100,150" fill="#2563eb" opacity="0.75" />
          <path d="M100,150 Q110,80 95,20 Q115,80 100,150" fill="#3b82f6" />
          <path d="M100,150 Q60,100 65,50 Q80,100 100,150" fill="#60a5fa" opacity="0.6" />
          <path d="M100,150 Q130,100 120,40 Q110,100 100,150" fill="#1d4ed8" opacity="0.85" />
          <path d="M100,150 Q140,110 135,60 Q120,110 100,150" fill="#93c5fd" opacity="0.65" />
          <ellipse cx="100" cy="150" rx="35" ry="8" fill="#d1e3f3" className="dark:fill-slate-805 bg-slate-100" />
          <path d="M65,150 L75,185 L125,185 L135,150 Z" fill="#b9d5ee" className="dark:fill-slate-850" />
        </svg>
      </div>

      {/* Plant Right SVG */}
      <div className="fixed bottom-0 right-0 pointer-events-none opacity-20 dark:opacity-10 z-0">
        <svg viewBox="0 0 200 200" className="w-36 h-36 lg:w-44 lg:h-44">
          <path d="M100,180 Q100,150 100,80" stroke="#3b82f6" strokeWidth="3" fill="none" />
          <path d="M100,150 Q70,130 50,120" stroke="#3b82f6" strokeWidth="2" fill="none" />
          <path d="M100,120 Q130,100 150,90" stroke="#3b82f6" strokeWidth="2" fill="none" />
          <path d="M100,80 C80,70 70,50 100,20 C130,50 120,70 100,80" fill="#3b82f6" />
          <path d="M50,120 C35,110 25,90 50,70 C75,90 65,110 50,120" fill="#60a5fa" opacity="0.8" />
          <path d="M150,90 C135,80 125,60 150,40 C175,60 165,80 150,90" fill="#2563eb" opacity="0.75" />
          <ellipse cx="100" cy="180" rx="30" ry="6" fill="#d1e3f3" className="dark:fill-slate-805 bg-slate-100" />
          <path d="M70,180 L78,200 L122,200 L130,180 Z" fill="#b9d5ee" className="dark:fill-slate-850" />
        </svg>
      </div>

      <div className="w-full max-w-sm space-y-4 relative z-10">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full border-[6px] border-amber-500 flex items-center justify-center bg-white shadow-md mx-auto mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-inner" />
          </div>
          <h1 className="text-xl font-black text-blue-650 dark:text-slate-100">TrustPay Family Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
            You are the guardian for this account. Approve or reject payments made by your family member.
          </p>
        </div>

        {/* Result Banner */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className={cn('p-4 rounded-2xl border-2 flex items-start gap-3 text-sm font-semibold',
                result === 'approved'
                  ? 'bg-green-50 dark:bg-green-900/20 border-success text-success'
                  : 'bg-red-50 dark:bg-red-900/20 border-danger text-danger')}>
              {result === 'approved'
                ? <CheckCircle2 className="w-5 h-5 shrink-0" />
                : <XCircle className="w-5 h-5 shrink-0" />}
              <div className="flex-1">
                {result === 'approved'
                  ? 'You approved the payment. Your family member can now proceed.'
                  : 'You rejected the payment. The transaction has been cancelled.'}
              </div>
              <button onClick={reset} className="opacity-50 hover:opacity-100 text-lg font-bold">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-cyan-200 rounded-2xl shadow-sm overflow-hidden">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-slate-500 animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-300 font-medium">Checking for requests...</p>
            </div>
          ) : request ? (
            <>
              {/* Pending Request */}
              <div className="h-1.5 bg-gradient-to-r from-warning to-danger" />
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-warning/20 rounded-xl shrink-0">
                    <ShieldAlert className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <h2 className="font-black text-cyan-600 dark:text-slate-100">Payment Approval Needed</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                      Your family member is trying to make a large payment
                    </p>
                  </div>
                </div>

                {/* Request Details */}
                <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-100 dark:border-cyan-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold uppercase tracking-wide">From</span>
                    <span className="text-sm font-bold text-cyan-600 dark:text-slate-100">{request.elderlyName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold uppercase tracking-wide">Amount</span>
                    <span className="text-2xl font-black text-danger">₹{request.amount}</span>
                  </div>
                  {request.note && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold uppercase tracking-wide">Note</span>
                      <span className="text-sm text-slate-500 dark:text-slate-300">{request.note}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 dark:text-slate-300 font-semibold uppercase tracking-wide">Time</span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-300">
                      {new Date(request.time).toLocaleTimeString('en-IN')}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-warning font-semibold text-center">
                  ⚠️ Review carefully — scammers may be asking your family member to pay.
                </p>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button onClick={handleReject} disabled={acting}
                    className="flex items-center justify-center gap-2 py-3 bg-danger hover:bg-red-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all active:scale-95">
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Reject
                  </button>
                  <button onClick={handleApprove} disabled={acting}
                    className="flex items-center justify-center gap-2 py-3 bg-success hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all active:scale-95">
                    {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Approve
                  </button>
                </div>
              </div>
            </>
          ) : (
            // No pending request
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-cyan-500 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-slate-500 dark:text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">No pending requests</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 text-center max-w-[200px]">
                This page will automatically update when your family member needs approval.
              </p>
              <button onClick={checkPending} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-300 hover:text-slate-500 mt-1 font-medium">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh now
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-300 dark:text-slate-500">
          This page auto-refreshes every 3 seconds. Keep it open on your phone.
        </p>
      </div>
    </div>
  );
}
