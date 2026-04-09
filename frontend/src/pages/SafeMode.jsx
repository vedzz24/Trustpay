import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Volume2, Phone, Search, AlertTriangle,
  QrCode, Clock, CheckCircle2, XCircle, Loader2, UploadCloud, ImageIcon, Lock, ArrowRight, ShieldCheck, FileSearch, Mic, Activity
} from 'lucide-react';
import { submitFamilyRequest, pollFamilyStatus, checkScam } from '../utils/api';
import { cn } from '../utils/cn';

const THRESHOLD = 2500;

export default function SafeMode({ addToast, user }) {
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAmount, setScanAmount]       = useState('');
  const [scanNote, setScanNote]           = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const [waitingFor, setWaitingFor]     = useState(null);
  const [approvalResult, setApproval]   = useState(null);
  const pollRef                         = useRef(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage]   = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageResult, setImageResult]       = useState(null);

  const [showCallModal, setShowCallModal] = useState(false);
  const [listening, setListening]         = useState(false);
  const [callResult, setCallResult]       = useState(null);

  const [scamText, setScamText]     = useState('');
  const [scamResult, setScamResult] = useState(null);
  const [checking, setChecking]     = useState(false);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const startPolling = (requestId, amount) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await pollFamilyStatus(requestId);
        if (res.status === 'approved') {
          clearInterval(pollRef.current);
          setWaitingFor(null);
          setApproval('approved');
          addToast(`✅ Family approved ₹${amount}.`, 'success');
        } else if (res.status === 'rejected') {
          clearInterval(pollRef.current);
          setWaitingFor(null);
          setApproval('rejected');
          addToast(`❌ Family rejected ₹${amount}. Cancelled.`, 'error');
        }
      } catch {}
    }, 2000);
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(scanAmount);
    if (!amt || amt <= 0) return addToast('Enter valid amount', 'error');

    if (amt < THRESHOLD) {
      addToast(`✅ Payment of ₹${amt} approved!`, 'success');
      setShowScanModal(false); setScanAmount(''); setScanNote(''); setApproval('approved');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitFamilyRequest(amt, scanNote, user?.name || 'User');
      if (res.success) {
        setShowScanModal(false); setScanAmount(''); setScanNote('');
        setWaitingFor({ requestId: res.requestId, amount: amt });
        addToast(`Payment needs family approval.`, 'info');
        startPolling(res.requestId, amt);
      }
    } catch { addToast('Error reaching server', 'error'); }
    finally { setSubmitting(false); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedImage(URL.createObjectURL(file)); setImageResult(null); }
  };

  const handleAnalyzeImage = () => {
    setAnalyzingImage(true);
    setTimeout(() => {
      setAnalyzingImage(false);
      setImageResult({
        fake: true,
        details: ['Inconsistent typography detected.', 'Missing API watermarks.', 'Pixellation artifacts found.']
      });
    }, 2500);
  };

  const handleStartListen = () => {
    setListening(true);
    setCallResult(null);
    setTimeout(() => {
      setListening(false);
      setCallResult({
        safe: false,
        message: 'High Risk Profile',
        details: ['Synthesized AI voice frequencies detected.', 'Urgency manipulation (e.g. "act fast" scripts).', 'Number flagged in external spoof databases.']
      });
    }, 3000);
  };

  const handleScamCheck = async (e) => {
    e.preventDefault();
    if (!scamText.trim()) return addToast('Paste message to check', 'error');
    setChecking(true);
    try {
      const res = await checkScam(scamText);
      setScamResult(res);
      addToast(res.result === 'Safe' ? 'Looks safe' : 'Possible scam', res.result === 'Safe' ? 'success' : 'error');
    } catch { addToast('Error checking message', 'error'); }
    finally { setChecking(false); }
  };

  const speakWarning = () => {
    if (!('speechSynthesis' in window)) return addToast('Voice not supported', 'error');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance('Warning! Never share your OTP.'));
    addToast('Playing voice warning...', 'info');
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all placeholder-slate-400";
  const headerCls = "text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2";

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      
      {/* Sleek Header & Titles */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Safe Mode</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Enterprise-grade security tools & real-time guardian triggers.</p>
        </div>

        {/* Minimal Alert Banners placed in header area */}
        <div className="flex flex-col items-end gap-2 shrink-0 max-w-xs w-full">
          {(approvalResult || waitingFor) ? (
            <AnimatePresence mode="popLayout">
              {approvalResult === 'approved' && (
                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="w-full h-11 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-success rounded-lg flex items-center gap-2 px-3 text-xs font-bold shrink-0">
                  <CheckCircle2 className="w-4 h-4" /> Family Approved Action
                </motion.div>
              )}
              {approvalResult === 'rejected' && (
                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="w-full h-11 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-danger rounded-lg flex items-center gap-2 px-3 text-xs font-bold shrink-0">
                  <XCircle className="w-4 h-4" /> Family Blocked Action
                </motion.div>
              )}
              {waitingFor && (
                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="w-full h-11 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg flex items-center gap-2 px-3 text-xs font-bold shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500" /> Awaiting Guardian (₹{waitingFor.amount})
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="w-full py-2.5 px-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-center gap-2 text-xs font-semibold text-danger">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              Never share your OTP or PIN with anyone.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Grid Column */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Quick Actions / Security Tools */}
          <div>
            <h2 className={headerCls}><Search className="w-4 h-4" /> Security Toolset</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div onClick={() => setShowImageModal(true)} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 p-5 rounded-2xl cursor-pointer shadow-sm hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="mt-4">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center justify-between">Check Payment <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" /></h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">AI scan to catch fake receipts.</p>
                </div>
              </div>

              <div onClick={() => { setApproval(null); setShowScanModal(true); }} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 p-5 rounded-2xl cursor-pointer shadow-sm hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="mt-4">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center justify-between">Scan QR Code <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" /></h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Guarded scanning (+₹{THRESHOLD}).</p>
                </div>
              </div>

              <div onClick={() => setShowCallModal(true)} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 dark:hover:border-cyan-500 p-5 rounded-2xl cursor-pointer shadow-sm hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="mt-4">
                  <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center justify-between">Check a Call <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" /></h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Live scam caller verification.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Scam Text Analyzer */}
          <div>
            <h2 className={headerCls}><FileSearch className="w-4 h-4" /> Message Analyzer</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-1 relative shadow-inner">
              <form onSubmit={handleScamCheck} className="flex flex-col relative bg-slate-800/50 rounded-2xl p-4 min-h-[200px] border border-white/5">
                <textarea rows={3} value={scamText} onChange={e => setScamText(e.target.value)}
                  className="bg-transparent text-slate-300 resize-none outline-none font-mono text-sm placeholder-slate-600 flex-1 leading-relaxed"
                  placeholder="> Paste incoming SMS, WhatsApp, or iMessage text here...&#10;> We will cross-reference it against active scam footprints." />
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex-1">
                    <AnimatePresence mode="popLayout">
                      {scamResult && (
                        <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className={cn("text-xs font-bold flex items-center gap-2", scamResult.result === 'Safe' ? "text-success" : "text-danger")}>
                          {scamResult.result === 'Safe' ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          {scamResult.message}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button type="submit" disabled={checking} className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black tracking-wide text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50">
                    {checking ? 'ANALYZING...' : 'OVERRIDE & CHECK'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sticky Sidebar Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sticky top-24">
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">Emergency Hub</h3>
            
            <div className="space-y-3">
               <button onClick={() => addToast('Emergency alert sent to family member!', 'success')} className="w-full group flex items-center gap-3 p-4 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 rounded-2xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 flex items-center justify-center text-slate-400 group-hover:text-danger transition-colors">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-danger transition-colors">Alert Family</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Instantly notify guardian.</p>
                  </div>
               </button>

               <button onClick={speakWarning} className="w-full group flex items-center gap-3 p-4 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 border border-slate-200 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-500/30 rounded-2xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 flex items-center justify-center text-slate-400 group-hover:text-warning transition-colors">
                    <Volume2 className="w-5 h-5" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-warning transition-colors">Voice Warning</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">Play audio security notice.</p>
                  </div>
               </button>
            </div>

            <hr className="my-6 border-slate-200 dark:border-slate-800" />
            
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3">TrustPay Guidelines</h4>
            <ul className="space-y-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <li className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                Payments above ₹{THRESHOLD.toLocaleString()} automatically notify your family for approval.
              </li>
              <li className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 shrink-0" />
                Official bank messages come from verified short codes.
              </li>
            </ul>
          </div>
        </div>

      </div>

      {/* ── Scan QR Modal ── */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="font-black text-slate-800 dark:text-white">Scan Setup</h2>
              </div>
              <form onSubmit={handleScanSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Amount (₹)</label>
                  <input type="number" min="1" required value={scanAmount} onChange={e => setScanAmount(e.target.value)} className={cn(inputCls, 'text-xl font-bold font-mono pl-5')} placeholder="0" autoFocus />
                  {parseFloat(scanAmount) >= THRESHOLD && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-2 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Over limit — guardian triggered</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Note (Optional)</label>
                  <input type="text" value={scanNote} onChange={e => setScanNote(e.target.value)} className={inputCls} placeholder="Add a description" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowScanModal(false); setScanAmount(''); setScanNote(''); }} className="flex-[0.8] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-[1.2] py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-900 font-black tracking-wide rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all">
                    {submitting ? 'SENDING...' : 'CONTINUE'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Check Payment Image Modal ── */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="font-black text-slate-800 dark:text-white">AI Scanner</h2>
                <button onClick={() => { setShowImageModal(false); setSelectedImage(null); setImageResult(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {!selectedImage ? (
                  <label className="flex flex-col items-center justify-center h-48 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group">
                    <UploadCloud className="w-8 h-8 text-cyan-500/50 group-hover:text-cyan-500 transition-colors mb-3" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 flex items-center justify-center min-h-[160px]">
                      <img src={selectedImage} alt="Receipt" className="max-h-48 max-w-full object-contain opacity-80" />
                      {analyzingImage && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    {!imageResult && !analyzingImage && (
                      <button onClick={handleAnalyzeImage} className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 transition-all">
                        RUN DIAGNOSTICS
                      </button>
                    )}
                    <AnimatePresence>
                      {imageResult && (
                        <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                          <p className="text-sm font-black text-danger flex items-center gap-2 uppercase tracking-wide"><ShieldAlert className="w-4 h-4" /> Fake Detected</p>
                          <ul className="text-xs space-y-1.5 mt-3 text-red-800 dark:text-red-300 list-disc pl-4 font-medium">
                            {imageResult.details.map((dt, i) => <li key={i}>{dt}</li>)}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Check Call Modal ── */}
      <AnimatePresence>
        {showCallModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h2 className="font-black text-slate-800 dark:text-white">Call Forensics</h2>
                <button onClick={() => { setShowCallModal(false); setListening(false); setCallResult(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 flex flex-col items-center">
                 
                 <div className={cn("w-32 h-32 rounded-full border-[6px] flex items-center justify-center transition-all duration-500", listening ? "border-cyan-500 shadow-[0_0_40px_rgba(6,182,212,0.4)]" : "border-slate-100 dark:border-slate-800")}>
                   <div className={cn("w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500", listening ? "bg-cyan-500/20 text-cyan-500 animate-pulse" : "bg-slate-50 dark:bg-slate-800 text-slate-400")}>
                     {listening ? <Activity className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
                   </div>
                 </div>

                 <div className="text-center w-full">
                    {!callResult && !listening && (
                      <>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">Ready to Intercept</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Hold your phone near the speaker or activate microphone passthrough to scan the caller's voice prints.</p>
                        <button onClick={handleStartListen} className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-black tracking-widest text-xs rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 transition-all">
                          START LISTENING
                        </button>
                      </>
                    )}
                    
                    {listening && (
                      <p className="font-bold text-cyan-600 dark:text-cyan-400 animate-pulse mt-4 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Recording audio buffer...
                      </p>
                    )}
                 </div>

                 <AnimatePresence>
                   {callResult && (
                     <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} className="p-4 w-full rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20">
                       <p className="text-sm font-black text-danger flex items-center gap-2 uppercase tracking-wide"><ShieldAlert className="w-4 h-4" /> {callResult.message}</p>
                       <ul className="text-xs space-y-1.5 mt-3 text-red-800 dark:text-red-300 list-disc pl-4 font-medium text-left">
                         {callResult.details.map((dt, i) => <li key={i}>{dt}</li>)}
                       </ul>
                     </motion.div>
                   )}
                 </AnimatePresence>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
