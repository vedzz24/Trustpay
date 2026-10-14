import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileImage, Headphones, KeyRound, Link2, LoaderCircle, LogIn, MessageSquareWarning, Mic, MicOff, Play, QrCode, RotateCcw, Save, Shield, ShieldCheck, Sparkles, Upload, Volume2 } from 'lucide-react';
import { checkMessageSafety, checkOtpSafety, checkPublicPaymentProof, checkQrSafety, fetchSafetyDashboard, loginSafetyUser, registerSafetyUser, runShieldSafetyScan, saveSafetyReport } from '../utils/api';
import { decodeQrImage } from '../utils/qrDecoder';
import CriticalRiskModal from '../components/CriticalRiskModal';
import InstallPrompt from '../components/InstallPrompt';

const shell = 'min-h-screen bg-[#F2F1F0] dark:bg-[#111] text-[#2b3033] dark:text-white px-4 py-8 sm:py-12 font-sans simple:text-lg';
const card = 'rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-[#1a1c1e] p-5 sm:p-6 simple:p-8 shadow-sm';
const button = 'w-full rounded-lg bg-[#15BCDF] hover:bg-[#3fd0ef] px-5 py-3.5 simple:py-5 text-xs simple:text-base font-bold uppercase tracking-wider text-[#111] disabled:opacity-50 transition-colors';
const input = 'w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/20 px-4 py-3 simple:py-4 text-sm simple:text-lg outline-none focus:border-[#15BCDF]';
const sampleBtn = 'text-left text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 hover:border-[#15BCDF] hover:text-[#15BCDF] transition-colors';

const tools = [
  ['/user/qr-check', 'QR Safety Check', QrCode],
  ['/user/message-check', 'Scam Message Check', MessageSquareWarning],
  ['/user/otp-check', 'OTP Scam Check', KeyRound],
  ['/user/audio-check', 'Audio Scam Check', Headphones],
  ['/user/payment-proof', 'Payment Screenshot Verify', FileImage],
  ['/user/shield-scan', 'Shield Scan', Shield],
];

function useResultSaver(checkType, result) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const available = Boolean(localStorage.getItem('trustpay_token')) && Boolean(result);
  const save = async () => {
    if (!result) return;
    setSaving(true);
    const rawRisk = result.riskLevel || result.risk || result.result || 'UNKNOWN';
    const riskLevel = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'NORMAL', 'SUSPICIOUS', 'UNKNOWN'].includes(rawRisk) ? rawRisk : 'UNKNOWN';
    const details = result.indicators || result.reasons || [];
    const response = await saveSafetyReport({
      checkType,
      riskLevel,
      resultCode: result.resultCode || result.result || `${riskLevel}_RISK`,
      summary: details.slice(0, 4).join('; ') || `${checkType} check returned ${riskLevel}.`
    });
    setSaving(false);
    setSaved(Boolean(response.success));
  };
  return { saving, saved, save, available };
}

function Header({ title, subtitle }) {
  return (
    <header className="mx-auto max-w-5xl">
      <Link to="/user" className="inline-flex items-center gap-2 text-xs simple:text-base font-bold uppercase tracking-wider text-slate-500 hover:text-[#15BCDF]">
        <ArrowLeft className="h-4 w-4 simple:h-6 simple:w-6"/>Safety Hub
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <span className="grid h-11 w-11 simple:h-16 simple:w-16 place-items-center rounded-lg bg-[#15BCDF] text-white">
          <ShieldCheck className="h-6 w-6 simple:h-8 simple:w-8"/>
        </span>
        <div>
          <p className="text-xs simple:text-sm font-black tracking-[.18em]">GUARDX</p>
          <h1 className="text-2xl sm:text-3xl simple:text-4xl sm:simple:text-5xl font-black uppercase tracking-wider">{title}</h1>
        </div>
      </div>
      {subtitle && <p className="mt-3 max-w-2xl text-sm simple:text-xl text-slate-500">{subtitle}</p>}
    </header>
  );
}

function Result({ result, onSave, saving, saved, available = true }) {
  if (!result) return null;
  const level = result.riskLevel || result.risk || result.result;
  const severe = ['HIGH', 'CRITICAL', 'SUSPICIOUS', 'INVALID_QR'].includes(level);
  return (
    <section className={`${card} mt-6`} aria-live="polite">
      <div className={`flex items-center gap-2 font-black uppercase tracking-wider ${severe ? 'text-red-500' : level === 'LOW' || level === 'NORMAL' ? 'text-emerald-500' : 'text-amber-500'}`}>
        {severe ? <AlertTriangle className="h-5 w-5"/> : <CheckCircle2 className="h-5 w-5"/>}
        {level}
      </div>
      {result.type && <p className="mt-4 text-sm"><span className="text-slate-500">Type:</span> <strong>{result.type}</strong></p>}
      {result.registeredMerchant && (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="font-black text-emerald-500">GUARDX REGISTERED MERCHANT ✓</p>
          <p className="mt-2 text-sm">{result.registeredMerchant.businessName}</p>
          <p className="text-sm text-slate-500">{result.registeredMerchant.merchantId}</p>
        </div>
      )}
      {result.payee && <p className="mt-3 text-sm">Payee: <strong>{result.payee}</strong></p>}
      {result.merchantName && <p className="mt-2 text-sm">Merchant: <strong>{result.merchantName}</strong></p>}
      {result.externalPayment && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-2.5">
          <p className="font-bold text-amber-500 uppercase tracking-wider">
            {result.externalPayment.belongsToTrustPay ? 'GUARDX MERCHANT PAYMENT' : 'EXTERNAL PAYMENT DETECTED (NON-TRUSTPAY)'}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            This payment was not made to a registered TrustPay merchant. Recipient details extracted from receipt:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-white/70 dark:bg-black/30 border border-amber-500/20">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Paid To</span>
              <strong className="text-sm text-[#2b3033] dark:text-white block mt-0.5">{result.externalPayment.paidTo || 'External Payee'}</strong>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Went Where / Destination</span>
              <strong className="text-xs text-[#2b3033] dark:text-white block mt-0.5 break-all">{result.externalPayment.destination || 'External Network'}</strong>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Amount</span>
              <strong className="text-sm text-emerald-600 dark:text-emerald-400 block mt-0.5">{result.externalPayment.amount != null ? `₹${result.externalPayment.amount}` : 'N/A'}</strong>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Reference / UTR</span>
              <span className="font-mono text-xs text-slate-600 dark:text-slate-300 block mt-0.5 break-all">{result.externalPayment.referenceId || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}
      {result.indicators?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider">Detected indicators</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
            {result.indicators.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}
      {result.reasons?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider">Analysis details</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
            {result.reasons.map(item => <li key={item}>{item}</li>)}
          </ul>
        </div>
      )}
      {result.recommendation && <p className="mt-4 text-sm font-semibold">{result.recommendation}</p>}
      {onSave && available && (
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
          <button onClick={onSave} disabled={saving || saved} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#15BCDF] hover:underline disabled:opacity-50">
            <Save className="h-4 w-4"/>
            {saving ? 'Saving…' : saved ? 'Saved to my account ✓' : 'Save Report to Dashboard'}
          </button>
        </div>
      )}
    </section>
  );
}

export function SafetyHub() {
  return (
    <div className={shell}>
      <InstallPrompt />
      <main className="mx-auto max-w-5xl">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-[#15BCDF]"/>
          <p className="mt-3 text-xs font-black tracking-[.2em]">GUARDX</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black uppercase tracking-wider">Safety Hub</h1>
          <p className="mt-3 text-slate-500">Check something suspicious before you act.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(([to, label, Icon]) => (
            <Link key={to} to={to} className={`${card} group min-h-36 flex flex-col justify-between hover:border-[#15BCDF] transition-colors`}>
              <Icon className="h-7 w-7 text-[#15BCDF]"/>
              <span className="mt-8 text-sm font-black uppercase tracking-wider">{label}</span>
            </Link>
          ))}
        </div>
        <section className={`${card} mt-8 text-center`}>
          <h2 className="font-black uppercase tracking-wider">GuardX Account Protection</h2>
          <p className="mt-2 text-sm text-slate-500">Save safety reports · View check history · Link a Guardian · Receive important alerts</p>
          <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            <Link to="/user/register" className="rounded-lg bg-[#15BCDF] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#111]">Create account</Link>
            <Link to="/user/login" className="rounded-lg border border-slate-300 dark:border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-wider">Sign in</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export function QrSafetyCheck() {
  const [payload, setPayload] = useState('');
  const [decoded, setDecoded] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [decodeError, setDecodeError] = useState(false);
  const { saving, saved, save, available } = useResultSaver('QR CHECK', result);

  const analyse = async value => {
    setLoading(true); setError(''); setResult(null);
    try {
      const response = await checkQrSafety(value ?? payload);
      if (!response.success) throw new Error(response.message);
      setResult(response.result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const upload = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(''); setDecodeError(false); setDecoded(''); setPayload(''); setResult(null);
    try {
      const value = await decodeQrImage(file);
      if (!value) { setDecodeError(true); return; }
      setPayload(value); setDecoded(value);
      const response = await checkQrSafety(value);
      if (!response.success) throw new Error(response.message);
      setResult(response.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); event.target.value = '';
    }
  };

  const handleSample = sampleText => {
    setPayload(sampleText);
    setDecoded(sampleText);
    analyse(sampleText);
  };

  return (
    <div className={shell}>
      <Header title="QR Safety Check" subtitle="Decode and inspect a QR destination before opening or paying."/>
      <main className="mx-auto mt-8 max-w-2xl">
        <section className={card}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider">QR text or payment URL</label>
            <span className="text-[11px] text-slate-400">Try quick samples:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
            <button type="button" onClick={() => handleSample('upi://pay?pa=vedzz24055@trustpay&pn=Vedant%20Jingade&am=500')} className={sampleBtn}>
              <strong className="block text-emerald-500">Verified Merchant</strong>
              <span className="text-[10px] text-slate-500 truncate block">TrustPay Merchant QR</span>
            </button>
            <button type="button" onClick={() => handleSample('upi://pay?pa=unknown.lottery99@ybl&pn=CashBonus&am=25000')} className={sampleBtn}>
              <strong className="block text-amber-500">Unknown Recipient</strong>
              <span className="text-[10px] text-slate-500 truncate block">High-Value UPI</span>
            </button>
            <button type="button" onClick={() => handleSample('http://192.168.1.10/pay/sbi-kyc-verify')} className={sampleBtn}>
              <strong className="block text-red-500">Suspicious URL</strong>
              <span className="text-[10px] text-slate-500 truncate block">Phishing IP address</span>
            </button>
          </div>

          <textarea value={payload} onChange={e => { setPayload(e.target.value); setDecoded(''); setDecodeError(false); }} className={`${input} min-h-28`} placeholder="upi://pay?... or https://..."/>
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 p-4 text-xs font-bold uppercase tracking-wider hover:border-[#15BCDF] transition-colors">
            <Upload className="h-4 w-4"/>Upload QR image
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={upload}/>
          </label>
          {loading && <p className="mt-3 flex items-center gap-2 text-sm text-[#15BCDF]"><LoaderCircle className="h-4 w-4 animate-spin"/>Decoding and checking QR…</p>}
          {decoded && (
            <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-black text-emerald-500">QR DETECTED ✓</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-500">Decoded Content</p>
              <p className="mt-1 break-all text-sm font-mono">{decoded}</p>
            </div>
          )}
          {decodeError && (
            <div role="alert" className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-black text-amber-600">UNABLE TO READ QR</p>
              <p className="mt-2 text-sm">No QR code was detected in this image.</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                <li>uploading a clearer image</li><li>cropping around the QR</li><li>avoiding blur or glare</li>
              </ul>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <button onClick={() => analyse()} disabled={loading || !payload.trim()} className={`${button} mt-4`}>
            {loading ? 'Checking…' : 'Check QR'}
          </button>
        </section>
        <Result result={result} onSave={save} saving={saving} saved={saved} available={available}/>
      </main>
    </div>
  );
}

export function TextSafetyCheck({ otp = false }) {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { saving, saved, save, available } = useResultSaver(otp ? 'OTP SCAM CHECK' : 'SCAM MESSAGE', result);

  const check = async (customText) => {
    const textToCheck = typeof customText === 'string' ? customText : message;
    setLoading(true); setError('');
    try {
      const response = await (otp ? checkOtpSafety(textToCheck) : checkMessageSafety(textToCheck));
      if (!response.success) throw new Error(response.message);
      setResult(response.result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSample = sampleText => {
    setMessage(sampleText);
    check(sampleText);
  };

  return (
    <div className={shell}>
      <CriticalRiskModal result={result} onAcknowledge={() => setResult({ ...result, riskLevel: 'HIGH' })} />
      <Header
        title={otp ? 'OTP Scam Check' : 'Scam Message Check'}
        subtitle={otp ? 'Paste the message around the OTP. Do not paste or share your actual OTP.' : 'Paste suspicious SMS, WhatsApp, email or chat text for an explainable rule-based check.'}
      />
      <main className="mx-auto mt-8 max-w-2xl">
        <section className={card}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Quick test samples:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
            {otp ? (
              <>
                <button type="button" onClick={() => handleSample('Your OTP is 849201. Share this OTP with the support executive to receive your Rs 5000 cashback reward immediately.')} className={sampleBtn}>
                  <strong className="block text-red-500">Cashback Scam</strong>
                  <span className="text-[10px] text-slate-500 truncate block">Share OTP request</span>
                </button>
                <button type="button" onClick={() => handleSample('Alert: Your debit card is blocked. Send OTP 492810 to our verification agent to avoid permanent penalty.')} className={sampleBtn}>
                  <strong className="block text-amber-500">Threat / Blocking</strong>
                  <span className="text-[10px] text-slate-500 truncate block">Urgent card threat</span>
                </button>
                <button type="button" onClick={() => handleSample('Your OTP for login to your account is 938102. Valid for 5 minutes. GuardX will never ask you for this code.')} className={sampleBtn}>
                  <strong className="block text-emerald-500">Normal OTP</strong>
                  <span className="text-[10px] text-slate-500 truncate block">Legitimate system alert</span>
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => handleSample('URGENT: Your SBI account will be blocked today due to pending KYC. Click http://sbi-kyc-verify.net immediately to update.')} className={sampleBtn}>
                  <strong className="block text-red-500">KYC Phishing</strong>
                  <span className="text-[10px] text-slate-500 truncate block">Bank threat & urgency</span>
                </button>
                <button type="button" onClick={() => handleSample('Congratulations! You have won Rs 25,00,000 in Kaun Banega Crorepati. Contact manager Rana Pratap to claim reward.')} className={sampleBtn}>
                  <strong className="block text-amber-500">Lottery Fraud</strong>
                  <span className="text-[10px] text-slate-500 truncate block">KBC cash prize prize</span>
                </button>
                <button type="button" onClick={() => handleSample('Your order #98234 has been delivered by Amazon logistics. Thank you for shopping with us.')} className={sampleBtn}>
                  <strong className="block text-emerald-500">Safe Notification</strong>
                  <span className="text-[10px] text-slate-500 truncate block">Standard order update</span>
                </button>
              </>
            )}
          </div>

          {otp && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm font-bold text-red-500">Never enter your actual OTP. Common numeric codes are redacted before analysis.</p>}
          <textarea value={message} onChange={e => setMessage(e.target.value)} className={`${input} min-h-44`} maxLength={10000} placeholder={otp ? "Paste message around the OTP…" : "Paste the suspicious message…"}/>
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <button onClick={() => check()} disabled={loading || !message.trim()} className={`${button} mt-4`}>
            {loading ? 'Analysing…' : 'Analyse Message'}
          </button>
        </section>
        <Result result={result} onSave={save} saving={saving} saved={saved} available={available}/>
      </main>
    </div>
  );
}

export function PaymentProofCheck() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { saving, saved, save, available } = useResultSaver('PAYMENT PROOF CHECK', result);

  const analyzeImage = async base64Data => {
    setLoading(true); setError('');
    try {
      const response = await checkPublicPaymentProof(base64Data);
      if (!response.success) throw new Error(response.message);
      setResult({
        risk: response.result === 'VERIFIED_PAYMENT' ? 'NORMAL' : response.result === 'EXTERNAL_PAYMENT' ? 'MEDIUM' : 'HIGH',
        riskLevel: response.result === 'VERIFIED_PAYMENT' ? 'NORMAL' : response.result === 'EXTERNAL_PAYMENT' ? 'MEDIUM' : response.result === 'INVALID_PAYMENT_PROOF' ? 'LOW' : 'HIGH',
        result: response.result,
        resultCode: response.result,
        reasons: [response.result.replaceAll('_', ' ')],
        registeredMerchantId: response.registeredMerchantId,
        trustedTransaction: response.trustedTransaction,
        externalPayment: response.externalPayment
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const upload = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError('Image must be 5 MB or smaller.');
    const reader = new FileReader();
    reader.onload = () => analyzeImage(reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className={shell}>
      <Header title="Payment Screenshot Verify" subtitle="Uses GuardX’s payment-proof OCR and trusted transaction matching to verify if a payment screenshot is authentic."/>
      <main className="mx-auto mt-8 max-w-2xl">
        <section className={card}>
          <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed border-slate-400 p-10 text-center hover:border-[#15BCDF] transition-colors">
            <FileImage className="h-9 w-9 text-[#15BCDF]"/>
            <strong>Upload payment screenshot</strong>
            <span className="text-xs text-slate-500">PNG, JPEG or WebP · maximum 5 MB</span>
            <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={upload}/>
          </label>
          {loading && <p className="mt-4 flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin"/>Analysing real payment evidence with OCR…</p>}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>
        <Result result={result} onSave={save} saving={saving} saved={saved} available={available}/>
      </main>
    </div>
  );
}

export function AudioSafetyCheck() {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const { saving, saved, save, available } = useResultSaver('AUDIO SCAM CHECK', result);

  const hasSpeechApi = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = () => {
    setError('');
    if (!hasSpeechApi) {
      setError('Live microphone transcription requires a browser supporting Web Speech API (such as Chrome or Edge). You can still test with the sample scam call transcripts below.');
      return;
    }
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';

      rec.onresult = event => {
        let current = '';
        for (let i = 0; i < event.results.length; i++) {
          current += event.results[i][0].transcript + ' ';
        }
        setTranscript(current.trim());
      };

      rec.onerror = e => {
        setError(`Microphone error: ${e.error}`);
        setRecording(false);
      };

      rec.onend = () => {
        setRecording(false);
      };

      rec.start();
      recognitionRef.current = rec;
      setRecording(true);
    } catch (err) {
      setError(`Could not start microphone: ${err.message}`);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setRecording(false);
  };

  const analyzeAudioTranscript = async (textToScan) => {
    const text = typeof textToScan === 'string' ? textToScan : transcript;
    if (!text.trim()) return setError('Please speak into the mic or select a sample call transcript.');
    setLoading(true); setError('');
    try {
      const response = await checkMessageSafety(text);
      if (!response.success) throw new Error(response.message);
      setResult(response.result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleCall = (text) => {
    setTranscript(text);
    analyzeAudioTranscript(text);
  };

  return (
    <div className={shell}>
      <Header title="Audio Scam Check" subtitle="Live voice recognition and audio call transcript analysis to detect phone scams and impersonation."/>
      <main className="mx-auto mt-8 max-w-2xl">
        <section className={card}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider">Test sample phone scam calls:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
            <button type="button" onClick={() => loadSampleCall('Hello sir, I am calling from Mumbai police cyber branch. Your Aadhaar card has been linked to a 2 crore money laundering case. A warrant is issued against you. Pay 15,000 penalty immediately to clear your name.')} className={sampleBtn}>
              <strong className="block text-red-500">Police / Arrest Scam</strong>
              <span className="text-[10px] text-slate-500 truncate block">Aadhaar money laundering</span>
            </button>
            <button type="button" onClick={() => loadSampleCall('Sir your electricity power supply will be cut off tonight at 9:30 PM because your previous month bill was not updated. Pay Rs 850 immediately to avoid power disconnection.')} className={sampleBtn}>
              <strong className="block text-amber-500">Electricity Cut Scam</strong>
              <span className="text-[10px] text-slate-500 truncate block">Urgent power disconnection</span>
            </button>
            <button type="button" onClick={() => loadSampleCall('Hi buddy, are you reaching the office on time today? Let us catch up over lunch around 1 PM.')} className={sampleBtn}>
              <strong className="block text-emerald-500">Normal Call</strong>
              <span className="text-[10px] text-slate-500 truncate block">Friendly conversation</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              type="button"
              onClick={recording ? stopListening : startListening}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#15BCDF] text-[#111] hover:bg-[#3fd0ef]'}`}
            >
              {recording ? <><MicOff className="h-4 w-4"/>Stop Listening</> : <><Mic className="h-4 w-4"/>Speak Live Scam Call</>}
            </button>
            {transcript && (
              <button
                type="button"
                onClick={() => { setTranscript(''); setResult(null); }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 text-xs font-bold uppercase tracking-wider hover:border-[#15BCDF]"
              >
                <RotateCcw className="h-4 w-4"/>Reset
              </button>
            )}
          </div>

          <label className="block text-xs font-bold uppercase tracking-wider mb-2">Transcribed Voice Audio Text</label>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            className={`${input} min-h-32`}
            placeholder={recording ? "Listening... Speak now..." : "Transcribed call speech or paste phone conversation..."}
          />

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <button onClick={() => analyzeAudioTranscript()} disabled={loading || !transcript.trim()} className={`${button} mt-4`}>
            {loading ? 'Analysing Call Speech…' : 'Analyse Voice Audio'}
          </button>
        </section>

        <Result result={result} onSave={save} saving={saving} saved={saved} available={available}/>
      </main>
    </div>
  );
}

export function ShieldScan() {
  const [message, setMessage] = useState('');
  const [qr, setQr] = useState('');
  const [proof, setProof] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const { saving, saved, save, available } = useResultSaver('SHIELD SCAN', report);

  const selectProof = event => {
    const file = event.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => setProof(reader.result);
    reader.readAsDataURL(file);
  };

  const scan = async () => {
    setLoading(true);
    const response = await runShieldSafetyScan(message.trim(), qr.trim(), proof);
    setLoading(false);
    if (response.success) {
      setReport({
        risk: response.result.riskLevel,
        riskLevel: response.result.riskLevel,
        result: response.result.resultCode,
        resultCode: response.result.resultCode,
        reasons: response.result.reasons,
        signals: response.result.signals
      });
    } else {
      setReport({
        risk: 'UNKNOWN',
        riskLevel: 'UNKNOWN',
        result: 'SHIELD_ERROR',
        resultCode: 'SHIELD_ERROR',
        reasons: [response.message]
      });
    }
  };

  const fillSampleScenario = (highRisk = true) => {
    if (highRisk) {
      setMessage('URGENT: Your account will be frozen in 1 hour due to KYC failure. Transfer Rs 2,500 immediately to retain access.');
      setQr('upi://pay?pa=fake.security99@okaxis&pn=AccountVerification');
    } else {
      setMessage('Your order was placed successfully with GuardX merchant.');
      setQr('upi://pay?pa=vedzz24055@trustpay&pn=Vedant%20Jingade&am=200');
    }
  };

  return (
    <div className={shell}>
      <Header title="GuardX Shield Scan" subtitle="Multi-vector security scan combining real signals (message, QR payload, and payment evidence)."/>
      <main className="mx-auto mt-8 max-w-2xl">
        <section className={`${card} space-y-4`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Fill test scenario:</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => fillSampleScenario(true)} className="text-[11px] font-bold text-red-500 hover:underline">High-Risk Scam</button>
              <span className="text-slate-400">·</span>
              <button type="button" onClick={() => fillSampleScenario(false)} className="text-[11px] font-bold text-emerald-500 hover:underline">Verified Merchant</button>
            </div>
          </div>

          <textarea className={`${input} min-h-24`} value={message} onChange={e => setMessage(e.target.value)} placeholder="Suspicious message (optional)"/>
          <textarea className={`${input} min-h-20`} value={qr} onChange={e => setQr(e.target.value)} placeholder="Decoded QR text or URL (optional)"/>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-400 p-4 text-xs font-bold uppercase tracking-wider hover:border-[#15BCDF] transition-colors">
            <FileImage className="h-4 w-4"/>
            {proof ? 'Payment screenshot selected ✓' : 'Add payment screenshot (optional)'}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={selectProof}/>
          </label>
          <button className={button} disabled={loading || (!message.trim() && !qr.trim() && !proof)} onClick={scan}>
            {loading ? 'Building report…' : 'Run Shield Scan'}
          </button>
        </section>
        <Result result={report} onSave={save} saving={saving} saved={saved} available={available}/>
      </main>
    </div>
  );
}

export function SafetyAccount({ login = false, setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const response = login
      ? await loginSafetyUser(form.email, form.password)
      : await registerSafetyUser(form.name, form.email, form.password);
    setLoading(false);
    if (!response.success) return setError(response.message);
    localStorage.setItem('trustpay_user', JSON.stringify(response.user));
    sessionStorage.setItem('trustpay_account_notice', response.message || 'Signed in successfully.');
    setUser?.(response.user);
    navigate('/user/dashboard');
  };

  return (
    <div className={shell}>
      <Header title={login ? 'User Login' : 'Create Safety Account'} subtitle="Access your saved checks, linked Guardian, and security reports."/>
      <main className="mx-auto mt-8 max-w-md">
        <form onSubmit={submit} className={`${card} space-y-4`}>
          {!login && <input className={input} placeholder="Name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/>}
          <input className={input} type="email" placeholder="Email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/>
          <input className={input} type="password" minLength={8} maxLength={128} placeholder="Password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={loading} className={button}>{loading ? 'Please wait…' : login ? 'Sign in' : 'Create account'}</button>
          <Link className="block text-center text-xs font-bold text-[#15BCDF]" to={login ? '/user/register' : '/user/login'}>
            {login ? 'Create a free account' : 'Already have an account?'}
          </Link>
        </form>
      </main>
    </div>
  );
}

export function SafetyDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice] = useState(() => sessionStorage.getItem('trustpay_account_notice'));

  useEffect(() => {
    fetchSafetyDashboard().then(r => {
      if (!r.success) navigate('/user/login', { replace: true });
      else setData(r);
    }).finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <div className={`${shell} grid place-items-center`}><LoaderCircle className="h-7 w-7 animate-spin text-[#15BCDF]"/></div>;
  if (!data) return null;

  return (
    <div className={shell}>
      <Header title="User Dashboard" subtitle={`Welcome, ${data.user.name}. View your saved safety checks and security health.`}/>
      <main className="mx-auto mt-8 max-w-5xl">
        {notice && <p className="mb-4 rounded-lg border border-[#15BCDF]/30 bg-[#15BCDF]/10 p-3 text-sm">{notice}</p>}
        {data.pendingGuardianRequests > 0 && (
          <Link to="/user/guardian" className="mb-4 flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-500">
            <span>{data.pendingGuardianRequests} Guardian protection request{data.pendingGuardianRequests === 1 ? '' : 's'} awaiting your decision.</span>
            <span className="text-xs uppercase tracking-wider">Review</span>
          </Link>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <section className={card}>
            <div className="flex items-center justify-between">
              <h2 className="font-black uppercase tracking-wider">Saved Safety Reports</h2>
              <Link to="/user" className="text-xs font-bold text-[#15BCDF] uppercase tracking-wider">New Check +</Link>
            </div>
            {data.reports.length ? (
              <ul className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {data.reports.map(r => (
                  <li key={r._id} className="rounded-lg border border-slate-200 dark:border-white/5 p-3">
                    <div className="flex justify-between items-center">
                      <strong className="text-sm">{r.checkType}</strong>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${['HIGH', 'CRITICAL'].includes(r.riskLevel) ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{r.riskLevel}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{r.summary}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{new Date(r.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No safety checks saved yet. Perform a check in the Safety Hub to save reports.</p>
            )}
          </section>

          <section className={card}>
            <h2 className="font-black uppercase tracking-wider">Recent Checks & History</h2>
            <p className="mt-4 text-sm text-slate-500">
              {data.reports.length ? `${data.reports.length} safety checks recorded under your account.` : 'No checks performed yet.'}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <Link to="/user/qr-check" className="p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:border-[#15BCDF] text-xs font-bold uppercase tracking-wider block text-center">
                Check QR
              </Link>
              <Link to="/user/message-check" className="p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:border-[#15BCDF] text-xs font-bold uppercase tracking-wider block text-center">
                Check Message
              </Link>
              <Link to="/user/otp-check" className="p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:border-[#15BCDF] text-xs font-bold uppercase tracking-wider block text-center">
                Check OTP
              </Link>
              <Link to="/user/audio-check" className="p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:border-[#15BCDF] text-xs font-bold uppercase tracking-wider block text-center">
                Check Voice Call
              </Link>
            </div>
          </section>

          <section className={card}>
            <h2 className="font-black uppercase tracking-wider">Guardian Protection</h2>
            <p className={`mt-4 text-sm font-bold ${data.guardianStatus === 'ACTIVE' ? 'text-emerald-500' : 'text-slate-500'}`}>
              {data.guardianStatus === 'ACTIVE' ? `ACTIVE ✓ · ${data.guardian?.email}` : data.pendingGuardianRequests ? 'REQUEST AWAITING YOUR APPROVAL' : 'NOT LINKED'}
            </p>
            <Link to="/user/guardian" className="mt-4 inline-block text-xs font-bold uppercase tracking-wider text-[#15BCDF]">
              {data.pendingGuardianRequests ? 'Review Guardian Requests' : 'Manage Guardian Requests'}
            </Link>
          </section>

          <section className={card}>
            <h2 className="font-black uppercase tracking-wider">Account Security</h2>
            <p className="mt-4 text-sm text-slate-500">Your password is stored as a salted PBKDF2 hash. When logging in or signing up, security alert emails are dispatched to your registered address.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
