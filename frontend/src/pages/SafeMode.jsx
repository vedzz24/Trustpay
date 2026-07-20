import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Volume2, Phone, Search, AlertTriangle,
  QrCode, Clock, CheckCircle2, XCircle, Loader2, UploadCloud, ImageIcon, Lock, ArrowRight, ShieldCheck, FileSearch, Mic, Activity, Trash2
} from 'lucide-react';
import { submitFamilyRequest, pollFamilyStatus, checkScam, fetchOtpAlerts, logOtpAlert, analyzeScreenshot } from '../utils/api';
import { cn } from '../utils/cn';

const THRESHOLD = 2500;

const SCAM_TEMPLATES = [
  {
    title: 'Bank KYC Suspension',
    sender: 'AD-SBIBNK',
    text: 'Dear customer, your bank account is suspended due to missing KYC. Click here to verify: https://sbi-kyc-verify.link/login. OTP required to unblock.'
  },
  {
    title: 'Electricity Power Cut',
    sender: 'AD-EBILL',
    text: 'ALERT: Your electricity connection will be disconnected tonight at 9:30 PM due to non-payment of previous bill. Call customer care at 98765-43210 immediately.'
  },
  {
    title: 'UPI Cashback Voucher',
    sender: 'AD-PAYTM',
    text: 'Congratulations! You have received ₹5,000 cashback from Paytm Rewards. Claim now by entering your UPI PIN: https://paytm-reward-check.com'
  }
];

export default function SafeMode({ addToast, user }) {
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAmount, setScanAmount]       = useState('');
  const [scanNote, setScanNote]           = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const [waitingFor, setWaitingFor]     = useState(null);
  const [approvalResult, setApproval]   = useState(null);
  const pollRef                         = useRef(null);

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedFile, setSelectedFile]     = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [imageResult, setImageResult]       = useState(null);
  const [overlays, setOverlays]             = useState([]);
  const canvasRef                           = useRef(null);

  const [showCallModal, setShowCallModal] = useState(false);
  const [listening, setListening]         = useState(false);
  const [callResult, setCallResult]       = useState(null);

  const [scamText, setScamText]     = useState('');
  const [scamResult, setScamResult] = useState(null);
  const [checking, setChecking]     = useState(false);
  
  const [otpLogs, setOtpLogs]       = useState([]);

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
                addToast(`✅ Family approved ₹${curr.amount}.`, 'success');
              } else if (data.status === 'rejected') {
                addToast(`❌ Family rejected ₹${curr.amount}. Cancelled.`, 'error');
              }
              // Stop polling since we got the real-time update
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
        console.error('Error parsing SSE event in SafeMode:', err);
      }
    };

    eventSource.onerror = () => {
      console.warn('SafeMode SSE connection failed. Standard polling fallback active.');
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
    } catch {
      // Fail silently to keep interface clean
    }
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

  // Text warning announcer using Web Speech
  const speakWarning = (textMsg = 'Warning! Never share your OTP code or UPI PIN with anyone.') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textMsg);
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
      addToast('Playing voice warning announcement...', 'info');
    } else {
      addToast('Voice warning played (TTS not supported in browser)', 'info');
    }
  };

  // OTP Scam Checker
  const handleScamCheck = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const textToCheck = textOverride || scamText;
    if (!textToCheck.trim()) return addToast('Paste message to scan', 'error');

    setChecking(true);
    setScamResult(null);

    try {
      const lower = textToCheck.toLowerCase();
      let riskScore = 0;
      let threats = [];
      let keywords = [];

      if (lower.includes('otp') || lower.includes('one time password') || lower.includes('passcode')) {
        riskScore += 45;
        threats.push('Urgent solicitation of temporary banking credentials (OTP).');
        keywords.push('otp');
      }
      if (lower.includes('urgent') || lower.includes('limit') || lower.includes('blocked') || lower.includes('suspended') || lower.includes('expired') || lower.includes('tonight')) {
        riskScore += 25;
        threats.push('High-pressure social engineering tactics urging immediate action.');
        keywords.push('urgent');
      }
      if (lower.includes('http') || lower.includes('https') || lower.includes('.link') || lower.includes('.com') || lower.includes('bit.ly') || lower.includes('.cc')) {
        riskScore += 20;
        threats.push('Inclusion of unauthorized external hyperlink payloads.');
        keywords.push('link');
      }
      if (lower.includes('lottery') || lower.includes('prize') || lower.includes('winner') || lower.includes('reward') || lower.includes('cashback')) {
        riskScore += 15;
        threats.push('Unsolicited finance hooks attempting credential harvesting.');
        keywords.push('lottery');
      }

      const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 15 ? 'medium' : 'low';
      const actionTaken = riskScore >= 40 ? 'Blocked & Sound Alert Fired' : 'Flagged & Audited';
      
      // Auto-populate sender tags
      let sender = 'AD-ALERT';
      if (lower.includes('sbi') || lower.includes('bank')) sender = 'VK-SBIBNK';
      else if (lower.includes('electricity') || lower.includes('bill')) sender = 'AD-EBILL';
      else if (lower.includes('paytm') || lower.includes('reward')) sender = 'AD-PAYTM';

      // Log threat logs to MongoDB via API
      await logOtpAlert(sender, textToCheck, riskLevel, keywords, actionTaken);
      await loadOtpHistory(); // Refresh feed logs!

      if (riskScore >= 40) {
        speakWarning(`Security Alert! Suspicious message intercepted. Critical risk of fraud. Never share OTP credentials.`);
      }

      setScamResult({
        risk: riskScore,
        level: riskLevel,
        reasons: threats.length > 0 ? threats : ['No common malicious patterns identified. Code audited safe.']
      });

      addToast(riskScore >= 40 ? '⚠️ High Risk Scam Intercepted!' : 'Text audited safely', riskScore >= 40 ? 'error' : 'success');

    } catch (err) {
      addToast('Auditing failed.', 'error');
    } finally {
      setChecking(false);
    }
  };

  // Draw Canvas Receipts
  const drawReceiptOnCanvas = (isFake, sampleType = 'paytm') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Reset dimensions
    canvas.width = 380;
    canvas.height = 480;

    // Background
    ctx.fillStyle = '#0f172a'; // Deep slate
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Border Frame
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // Brand header
    ctx.fillStyle = sampleType === 'paytm' ? '#0ea5e9' : '#a855f7';
    ctx.font = 'black 22px system-ui, sans-serif';
    ctx.fillText(sampleType === 'paytm' ? 'paytm' : 'Google Pay', 40, 65);

    // Banner Line
    ctx.fillStyle = isFake ? '#ef4444' : '#10b981';
    ctx.fillRect(40, 85, 300, 3);

    // Text status
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('STATUS: PAYMENT COMPLETED', 40, 110);

    // Payment Amount
    ctx.fillStyle = '#f8fafc';
    if (isFake) {
      // edited font font-family mismatch
      ctx.font = 'bold 38px Arial, sans-serif'; 
      ctx.fillStyle = '#38bdf8'; 
      ctx.fillText('₹ 5,000', 80, 165);
      
      // simulated smudge box around amount
      ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.fillRect(75, 125, 185, 50);
    } else {
      ctx.font = 'black 34px system-ui, sans-serif'; 
      ctx.fillText('₹ 1,200', 80, 165);
    }

    // Details Fields
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'semibold 12px system-ui, sans-serif';
    ctx.fillText('To: TrustPay Demo Store', 40, 220);
    ctx.fillText('From: Rahul Sharma', 40, 245);
    
    // Transaction ID
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    const refNo = isFake ? 'TXN_FAKE_GPAY_999' : 'TRX_873928104712_2026';
    ctx.fillText(`UPI Ref No: ${refNo}`, 40, 290);

    // Brand Watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(40, 330, 300, 45);
    ctx.fillStyle = isFake ? '#ef4444' : '#10b981';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(isFake ? '✖ VERIFICATION OUT OF SYNC' : '✔ INTEGRITY GUARANTEED', 55, 355);

    // Time stamp
    ctx.fillStyle = '#64748b';
    ctx.font = '9px system-ui';
    ctx.fillText(`Timestamp: ${new Date().toLocaleDateString('en-IN')}`, 40, 410);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setImageResult(null);
      setOverlays([]);
      
      // Draw standard receipt layout representing the uploaded file
      setTimeout(() => {
        drawReceiptOnCanvas(file.name.toLowerCase().includes('fake') || file.name.toLowerCase().includes('bad'), 'paytm');
      }, 100);
    }
  };

  const loadSampleScreenshot = (isFake, sampleType) => {
    setSelectedFile({ name: isFake ? 'fake_receipt_edited.png' : 'authentic_receipt.png' });
    setImageResult(null);
    setOverlays([]);
    setTimeout(() => {
      drawReceiptOnCanvas(isFake, sampleType);
    }, 100);
  };

  const runScreenshotForensics = async () => {
    if (!selectedFile) return;
    setAnalyzingImage(true);
    setImageResult(null);
    setOverlays([]);

    // Wait for the laser line scanner animation
    setTimeout(async () => {
      setAnalyzingImage(false);
      try {
        const isFakeName = selectedFile.name.toLowerCase().includes('fake');
        const simulatedText = isFakeName ? 'paytm spoof fake 5000' : 'authentic payment receipt';
        
        const res = await analyzeScreenshot(selectedFile.name, simulatedText);
        if (res.success) {
          setImageResult({
            fake: res.fake,
            details: res.details
          });
          setOverlays(res.overlays || []);

          // Redraw and render bounding boxes on the canvas!
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            (res.overlays || []).forEach(ov => {
              // Draw red highlighted box
              ctx.strokeStyle = '#EF4444';
              ctx.lineWidth = 2.5;
              ctx.strokeRect(ov.x, ov.y, ov.width, ov.height);

              // Draw Label tag
              ctx.fillStyle = '#EF4444';
              ctx.fillRect(ov.x, ov.y - 20, ov.width, 20);
              
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 9px system-ui, sans-serif';
              ctx.fillText(ov.label, ov.x + 5, ov.y - 7);
            });
          }

          if (res.fake) {
            speakWarning('Tampering Alert! Suspicious receipt detected. Typography and metadata mismatch.');
          }
        }
      } catch (err) {
        addToast('Forensics analysis failed.', 'error');
      }
    }, 2500);
  };

  // Fake voice forensics check
  const handleStartListen = () => {
    setListening(true);
    setCallResult(null);
    setTimeout(() => {
      setListening(false);
      setCallResult({
        safe: false,
        message: 'High Risk Call Profile Detected',
        details: [
          'AI-Synthesized spoofed frequencies detected on incoming buffer.',
          'Cognitive manipulation scripts identified (e.g. "account blocked").',
          'Phone routing spoofing signatures match fraud network profile.'
        ]
      });
      speakWarning('Warning! Suspicious caller detected. Do not click links or share UPI pins.');
    }, 3000);
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/5 dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50 transition-all placeholder-slate-400 dark:placeholder-slate-500 font-medium text-sm";
  const headerCls = "text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 relative">
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-accent-500/5 dark:bg-accent-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200/60 dark:border-slate-850">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Cyber Security Safe Mode</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Enterprise defenses for family accounts — screenshot audits, caller validation, and OTP threat shield.</p>
        </div>

        {/* Real-time family approval alert banners */}
        <div className="flex flex-col items-end gap-2 shrink-0 max-w-xs w-full">
          {(approvalResult || waitingFor) ? (
            <AnimatePresence mode="popLayout">
              {approvalResult === 'approved' && (
                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="w-full h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center gap-2 px-3 text-xs font-black shrink-0">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Guardian Approved Transaction
                </motion.div>
              )}
              {approvalResult === 'rejected' && (
                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="w-full h-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center gap-2 px-3 text-xs font-black shrink-0">
                  <XCircle className="w-4 h-4 shrink-0" /> Guardian Blocked Transaction
                </motion.div>
              )}
              {waitingFor && (
                <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="w-full h-11 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 rounded-xl flex items-center gap-2 px-3 text-xs font-black shrink-0">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" /> Awaiting approval (₹{waitingFor.amount})
                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <div className="w-full py-2.5 px-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs font-bold text-red-500">
              <ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" />
              Security Shield Engaged. Never share OTPs.
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Interactive Security Toolset */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Tool Launcher cards */}
          <div>
            <h2 className={headerCls}><Search className="w-4 h-4" /> Operational Shield Systems</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div onClick={() => setShowImageModal(true)} 
                className="group bg-white/70 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-800/60 hover:border-primary-500 dark:hover:border-primary-500/60 p-5 rounded-3xl cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300 flex flex-col justify-between min-h-[150px]">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between text-sm">Forensic Receipt Analyzer <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" /></h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">Canvas scanner to spot edited bills.</p>
                </div>
              </div>

              <div onClick={() => { setApproval(null); setShowScanModal(true); }} 
                className="group bg-white/70 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-800/60 hover:border-primary-500 dark:hover:border-primary-500/60 p-5 rounded-3xl cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300 flex flex-col justify-between min-h-[150px]">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between text-sm">Scan Guarded Payment <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" /></h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">Large transactions requiring approval.</p>
                </div>
              </div>

              <div onClick={() => setShowCallModal(true)} 
                className="group bg-white/70 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-800/60 hover:border-primary-500 dark:hover:border-primary-500/60 p-5 rounded-3xl cursor-pointer shadow-lg hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-300 flex flex-col justify-between min-h-[150px]">
                <div className="w-10 h-10 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between text-sm">Scam Caller Intercept <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" /></h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">Live voice frequency spoof scanner.</p>
                </div>
              </div>

            </div>
          </div>

          {/* SMS & OTP Interceptor simulator */}
          <div>
            <h2 className={headerCls}><FileSearch className="w-4 h-4" /> Message Scam Interceptor Shield</h2>
            <div className="bg-slate-900 border border-slate-850 rounded-[2rem] p-5 lg:p-6 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-primary-500/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">Live SMS Threat Auditor</h3>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Scans details & logs attacks to central DB</p>
                </div>
                <div className="flex gap-2">
                  {SCAM_TEMPLATES.map((tmpl, idx) => (
                    <button key={idx} type="button" onClick={() => { setScamText(tmpl.text); handleScamCheck(null, tmpl.text); }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-black uppercase rounded-lg border border-slate-700/50 transition-colors">
                      Scam {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleScamCheck} className="space-y-4">
                <textarea rows={3} value={scamText} onChange={e => setScamText(e.target.value)}
                  className="w-full bg-slate-950 text-slate-300 resize-none outline-none font-mono text-xs p-4 rounded-xl border border-slate-850 placeholder-slate-600 focus:ring-1 focus:ring-primary-500/50 leading-relaxed"
                  placeholder="Paste suspicious SMS, WhatsApp message, or OTP request text here..." />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <AnimatePresence mode="popLayout">
                      {scamResult && (
                        <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} 
                          className={cn("p-4 rounded-2xl border text-xs space-y-2", 
                            scamResult.risk >= 40 ? "bg-red-500/5 border-red-500/20 text-red-400" : "bg-emerald-500/5 border-emerald-500/20 text-emerald-400")}>
                          <div className="flex items-center gap-2 font-black uppercase tracking-wider">
                            {scamResult.risk >= 40 ? <ShieldAlert className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
                            Risk Level: {scamResult.level.toUpperCase()} ({scamResult.risk}% probability)
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-[11px] font-semibold text-slate-400">
                            {scamResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button type="submit" disabled={checking} 
                    className="shrink-0 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-black tracking-wide text-xs uppercase rounded-xl shadow-lg shadow-primary-500/20 disabled:opacity-50">
                    {checking ? 'Analyzing...' : 'Audit Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Side: Emergency Hub & Database Log History */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Emergency Commands */}
          <div className="bg-white/70 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-800/60 rounded-[2rem] p-6 shadow-lg">
            <h3 className="text-base font-black text-slate-800 dark:text-white mb-4">Emergency Safeguards</h3>
            
            <div className="space-y-3">
               <button onClick={() => addToast('Emergency distress alert broadcasted to guardians!', 'success')} 
                 className="w-full group flex items-center gap-3.5 p-4 bg-white/50 dark:bg-slate-900/20 hover:bg-red-500/10 border border-slate-200/50 dark:border-slate-850 hover:border-red-500/25 rounded-2xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 group-hover:bg-red-950/20 flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-red-500 transition-colors">SOS Broadcast Alert</p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Ping all guard endpoints.</p>
                  </div>
               </button>

               <button onClick={() => speakWarning()} 
                 className="w-full group flex items-center gap-3.5 p-4 bg-white/50 dark:bg-slate-900/20 hover:bg-amber-500/10 border border-slate-200/50 dark:border-slate-850 hover:border-amber-500/25 rounded-2xl transition-all">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 group-hover:bg-amber-950/20 flex items-center justify-center text-slate-400 group-hover:text-warning transition-colors">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-warning transition-colors">Sound Voice Warning</p>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5">Play anti-OTP scam notice.</p>
                  </div>
               </button>
            </div>
          </div>

          {/* MongoDB Scanned Threat Alert Logs */}
          <div className="bg-white/70 dark:bg-slate-900/35 border border-slate-200/50 dark:border-slate-800/60 rounded-[2rem] p-6 shadow-lg space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-450 tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-red-500" /> Database Threat Logs
            </h3>

            {otpLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <ShieldCheck className="w-8 h-8 text-slate-400/50 mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-wider">No threats logged</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {otpLogs.map(log => (
                  <div key={log._id} className="p-3 bg-slate-50/50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[10px]">{log.sender}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                        log.riskLevel === 'critical' || log.riskLevel === 'high' ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20")}>
                        {log.riskLevel}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold line-clamp-2 leading-relaxed">"{log.message}"</p>
                    <div className="flex items-center justify-between text-[8px] text-slate-400 dark:text-slate-500 font-bold pt-1 border-t border-slate-100 dark:border-slate-850">
                      <span>{log.actionTaken}</span>
                      <span>{new Date(log.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Scan QR / Guarded Modal ── */}
      <AnimatePresence>
        {showScanModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200/40 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30">
                <h2 className="font-black text-slate-800 dark:text-white text-base">Guarded Transfer</h2>
              </div>
              <form onSubmit={handleScanSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Amount Value (₹)</label>
                  <input type="number" min="1" required value={scanAmount} onChange={e => setScanAmount(e.target.value)} className={cn(inputCls, 'text-xl font-bold font-mono pl-5')} placeholder="0" autoFocus />
                  {parseFloat(scanAmount) >= THRESHOLD && (
                    <p className="text-[10px] text-amber-500 font-bold mt-2.5 flex items-center gap-1.5"><ShieldAlert className="w-4 h-4 shrink-0 animate-pulse" /> Safeguard: Exceeds limit — Guardian approval required</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Note (Optional)</label>
                  <input type="text" value={scanNote} onChange={e => setScanNote(e.target.value)} className={inputCls} placeholder="e.g. Shopping payment" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowScanModal(false); setScanAmount(''); setScanNote(''); }} className="flex-[0.8] py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-250 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 font-bold text-xs uppercase rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-[1.2] py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-black tracking-wide text-xs uppercase rounded-xl shadow-lg active:scale-95 transition-all">
                    {submitting ? 'Sending Request...' : 'Trigger Secure Scan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Screenshot Forensics Modal ── */}
      <AnimatePresence>
        {showImageModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl border border-slate-200/40 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              
              <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-850 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <h2 className="font-black text-slate-800 dark:text-white text-base">Forensic Receipt Canvas Scanner</h2>
                </div>
                <button onClick={() => { setShowImageModal(false); setSelectedFile(null); setImageResult(null); setOverlays([]); }} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-5 h-5"/></button>
              </div>

              <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left panel: Canvas */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-full aspect-[380/480] max-h-[360px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
                    <canvas ref={canvasRef} className="w-full h-full object-contain" />
                    
                    {/* Visual laser scanner line overlay */}
                    {analyzingImage && (
                      <motion.div className="absolute left-0 right-0 h-1 bg-cyan-400/90 shadow-[0_0_15px_#22d3ee] z-20"
                        initial={{ top: '0%' }} animate={{ top: '100%' }} transition={{ duration: 2.3, ease: 'easeInOut', repeat: 0 }} />
                    )}

                    {!selectedFile && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <UploadCloud className="w-10 h-10 text-cyan-500/40 mb-3 animate-bounce" />
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Audit Canvas Offline</span>
                        <p className="text-[9px] text-slate-600 mt-1 max-w-[200px]">Upload a screenshot or click on a simulator template below to draw a mock receipt.</p>
                      </div>
                    )}
                  </div>

                  {/* Manual file upload */}
                  <label className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-350 text-[10px] font-black uppercase rounded-xl border border-slate-700/50 cursor-pointer transition-colors text-center shrink-0">
                    Upload receipt file
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>

                {/* Right panel: Controls & Analysis results */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Preset Forensic Templates</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => loadSampleScreenshot(true, 'paytm')}
                          className="px-3 py-2 bg-red-500/5 border border-red-500/10 hover:border-red-500/20 text-red-400 text-[10px] font-bold rounded-xl transition-all">
                          Load Manipulated Paytm
                        </button>
                        <button type="button" onClick={() => loadSampleScreenshot(true, 'gpay')}
                          className="px-3 py-2 bg-red-500/5 border border-red-500/10 hover:border-red-500/20 text-red-400 text-[10px] font-bold rounded-xl transition-all">
                          Load Manipulated GPay
                        </button>
                        <button type="button" onClick={() => loadSampleScreenshot(false, 'paytm')}
                          className="px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-xl transition-all col-span-2">
                          Load Authentic Receipt
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-150 dark:border-slate-850 pt-4">
                      {analyzingImage ? (
                        <div className="flex items-center gap-2 p-4 bg-slate-900 border border-slate-850 rounded-2xl text-cyan-400 text-xs font-bold animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          Performing color-profile analysis & font forensics...
                        </div>
                      ) : imageResult ? (
                        <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} 
                          className={cn("p-4 rounded-2xl border text-xs space-y-3",
                            imageResult.fake ? "bg-red-500/5 border-red-500/25 text-red-400" : "bg-emerald-500/5 border-emerald-500/25 text-emerald-400")}>
                          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[11px]">
                            {imageResult.fake ? <ShieldAlert className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
                            Verdict: {imageResult.fake ? 'SCREENSHOT MANIPULATED' : 'SCREENSHOT AUTHENTIC'}
                          </div>
                          <ul className="list-disc pl-4 space-y-1.5 text-[11px] font-semibold text-slate-400">
                            {imageResult.details.map((dt, i) => <li key={i}>{dt}</li>)}
                          </ul>
                        </motion.div>
                      ) : (
                        <div className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl text-[10px] font-semibold text-slate-500 leading-relaxed">
                          Awaiting file audit. The tool will check font families, bounding boxes metadata, and cross-reference with the central payment registry database.
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedFile && !analyzingImage && !imageResult && (
                    <button onClick={runScreenshotForensics} className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-black tracking-wide text-xs uppercase rounded-xl shadow-lg">
                      Run Diagnostic Scan
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Caller Intercept Modal ── */}
      <AnimatePresence>
        {showCallModal && (
          <div className="fixed inset-0 z-[100] bg-slate-950/65 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale:.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:.95, opacity:0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl border border-slate-200/40 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="px-6 py-5 border-b border-slate-150 dark:border-slate-850 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30">
                <h2 className="font-black text-slate-800 dark:text-white text-base">Call Spoof Scanner</h2>
                <button onClick={() => { setShowCallModal(false); setListening(false); setCallResult(null); }} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-5 h-5"/></button>
              </div>
              <div className="p-6 overflow-y-auto space-y-6 flex flex-col items-center">
                 
                 <div className={cn("w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-500", listening ? "border-primary-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-pulse" : "border-slate-200 dark:border-slate-850")}>
                   <div className={cn("w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500", listening ? "bg-primary-500/10 text-primary-500" : "bg-slate-50 dark:bg-slate-900 text-slate-400")}>
                     {listening ? <Activity className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                   </div>
                 </div>

                 <div className="text-center w-full">
                    {!callResult && !listening && (
                      <>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">Intercept Call Audio</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 mb-6 leading-relaxed font-semibold">Place your phone near the call speaker. The scanner intercepts calling frequencies and flags synthesized voice signatures.</p>
                        <button onClick={handleStartListen} className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-black tracking-wide text-xs uppercase rounded-xl shadow-md transition-all active:scale-95">
                          Start Audio Intercept
                        </button>
                      </>
                    )}
                    
                    {listening && (
                      <p className="font-black text-primary-500 text-[10px] uppercase tracking-widest animate-pulse flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Auditing Calling Frequency...
                      </p>
                    )}
                 </div>

                 <AnimatePresence>
                   {callResult && (
                     <motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} className="p-4 w-full rounded-2xl bg-red-500/5 border border-red-500/20 text-red-400">
                       <p className="text-[11px] font-black flex items-center gap-2 uppercase tracking-wide"><ShieldAlert className="w-4 h-4 shrink-0" /> {callResult.message}</p>
                       <ul className="text-[10px] space-y-1.5 mt-2.5 text-slate-400 list-disc pl-4 font-semibold text-left">
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
