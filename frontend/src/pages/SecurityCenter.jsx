import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, Radio, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { fetchLatestVerification, fetchSecurityEvents, fetchSecurityStatus, getApiUrl, verifySecurityTransaction } from '../utils/api';

const LEVELS = ['ALL', 'INFO', 'WARNING', 'HIGH', 'CRITICAL'];
const severityClass = {
  INFO: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  WARNING: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  HIGH: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  CRITICAL: 'text-red-500 bg-red-500/10 border-red-500/20',
};
const show = value => value ?? 'Not available';
const dateTime = value => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available';

export default function SecurityCenter() {
  const [status, setStatus] = useState(null);
  const [events, setEvents] = useState([]);
  const [latest, setLatest] = useState(null);
  const [streamConnected, setStreamConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [identifier, setIdentifier] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    try {
      const [statusData, eventData, latestData] = await Promise.all([
        fetchSecurityStatus(), fetchSecurityEvents(), fetchLatestVerification(),
      ]);
      if (!statusData.success || !eventData.success || !latestData.success) throw new Error();
      setStatus(statusData);
      setEvents(eventData.events || []);
      setLatest(latestData.verification || null);
      setError('');
    } catch {
      setStatus(null); setEvents([]); setLatest(null);
      setError('Unable to load authenticated security records.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem('trustpay_token');
    const stream = new EventSource(`${getApiUrl('/stream')}?accessToken=${encodeURIComponent(token || '')}`);
    stream.onopen = () => setStreamConnected(true);
    stream.onerror = () => setStreamConnected(false);
    load();
    return () => stream.close();
  }, []);

  const filtered = useMemo(() => filter === 'ALL' ? events : events.filter(item => item.severity === filter), [events, filter]);
  const stats = status?.statistics || { verifiedPaymentsToday: 0, invalidSignatureAttempts: 0, duplicateEventsBlocked: 0, failedPayments: 0 };
  const system = status?.system || {};
  const card = 'bg-white/60 dark:bg-[#1a1c1e] border border-slate-300 dark:border-white/10 rounded-xl shadow-sm';

  const verify = async event => {
    event.preventDefault();
    if (!identifier.trim()) return;
    setVerifying(true); setResult(null);
    try {
      setResult(await verifySecurityTransaction(identifier.trim(), claimedAmount));
      await load();
    } catch { setResult({ success: false, message: 'Verification request failed.' }); }
    finally { setVerifying(false); }
  };

  const statuses = [
    ['Webhook Listener', system.webhookListener || 'OFFLINE'],
    ['Signature Verification', system.signatureVerification || 'OFFLINE'],
    ['Merchant Isolation', system.merchantIsolation || 'OFFLINE'],
    ['Payment Stream', streamConnected ? 'CONNECTED' : 'DISCONNECTED'],
  ];

  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8 min-h-screen font-sans">
    <header className="pb-6 border-b border-slate-300 dark:border-white/10">
      <p className="text-[10px] font-bold tracking-[.24em] text-[#15BCDF] uppercase">Evidence and audit trail</p>
      <h1 className="text-3xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white mt-2">Security Center</h1>
      <p className="text-[#6b6f72] dark:text-slate-400 text-sm font-medium mt-1">Why TrustPay trusted, rejected, or flagged a payment.</p>
    </header>

    {error && <div role="alert" className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm font-semibold">{error}</div>}

    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Security statistics">
      {[
        ['Verified Payments Today', stats.verifiedPaymentsToday, CheckCircle2, 'text-emerald-500'],
        ['Invalid Signature Attempts', stats.invalidSignatureAttempts, ShieldAlert, 'text-red-500'],
        ['Duplicate Events Blocked', stats.duplicateEventsBlocked, AlertTriangle, 'text-amber-500'],
        ['Failed Payments', stats.failedPayments, X, 'text-orange-500'],
      ].map(([label, value, Icon, color]) => <div key={label} className={`${card} p-5`}>
        <div className="flex items-start justify-between gap-3"><span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</span><Icon className={`w-4 h-4 ${color}`} /></div>
        <p className={`text-3xl font-bold mt-5 ${color}`}>{loading ? '—' : value}</p>
      </div>)}
    </section>

    <div className="grid lg:grid-cols-2 gap-6">
      <section className={`${card} p-6`}>
        <div className="flex items-center gap-3 mb-5"><Radio className="w-5 h-5 text-[#15BCDF]"/><h2 className="text-sm font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Live System Status</h2></div>
        <div className="divide-y divide-slate-200 dark:divide-white/5">{statuses.map(([label, value]) => {
          const active = ['ACTIVE', 'CONNECTED'].includes(value);
          return <div key={label} className="flex items-center justify-between py-3.5 gap-4"><span className="text-xs font-semibold text-[#6b6f72] dark:text-slate-400">{label}</span><span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${active ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-red-500 bg-red-500/10 border-red-500/20'}`}>{value}</span></div>;
        })}</div>
      </section>

      <section className={`${card} p-6`}>
        <div className="flex items-center gap-3 mb-5"><ShieldCheck className="w-5 h-5 text-[#15BCDF]"/><h2 className="text-sm font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Latest Verification</h2></div>
        {!latest ? <p className="text-sm text-slate-500 italic py-10 text-center">No verified payment records yet.</p> : <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {[
            ['Amount', `₹${latest.amount}`], ['TrustPay Transaction', latest.trustpayTransactionId], ['Merchant', latest.merchantId],
            ['Razorpay Order', show(latest.razorpayOrderId)], ['Razorpay Payment', show(latest.razorpayPaymentId)], ['Gateway Status', show(latest.gatewayStatus)],
            ['Webhook Signature', show(latest.webhookSignature)], ['Merchant Match', latest.merchantMatch], ['Duplicate Event', latest.duplicateEvent ? 'YES' : 'NO'], ['Verified At', dateTime(latest.verifiedAt)],
          ].map(([label, value]) => <Info key={label} label={label} value={value}/>)}
          <div className="col-span-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-center text-xs font-bold uppercase tracking-wider">TrustPay Verified ✓</div>
        </div>}
      </section>
    </div>

    <section className={`${card} p-6`}>
      <div className="flex items-center gap-3 mb-5"><FileSearch className="w-5 h-5 text-[#15BCDF]"/><div><h2 className="text-sm font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Verify Transaction</h2><p className="text-xs text-slate-500 mt-1">Searches only this authenticated merchant’s transaction database.</p></div></div>
      <form onSubmit={verify} className="grid md:grid-cols-[1fr_180px_auto] gap-3">
        <input required value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="TrustPay transaction ID or payment ID" className="px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 text-sm text-[#2b3033] dark:text-white outline-none focus:ring-1 focus:ring-[#15BCDF]"/>
        <input value={claimedAmount} onChange={e => setClaimedAmount(e.target.value)} type="number" min="0" step="0.01" placeholder="Claimed amount" className="px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 text-sm text-[#2b3033] dark:text-white outline-none focus:ring-1 focus:ring-[#15BCDF]"/>
        <button disabled={verifying} className="px-5 py-3 rounded-lg bg-[#15BCDF] hover:bg-[#3fd0ef] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider">{verifying ? 'Verifying…' : 'Verify Transaction'}</button>
      </form>
      {result && <VerificationResult result={result}/>}
    </section>

    <section className={`${card} overflow-hidden`}>
      <div className="p-6 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 className="text-sm font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Security Event Log</h2><p className="text-xs text-slate-500 mt-1">Authenticated merchant audit records only.</p></div><div className="flex flex-wrap gap-2">{LEVELS.map(level => <button key={level} onClick={() => setFilter(level)} className={`px-3 py-1.5 rounded-md text-[9px] font-bold border ${filter === level ? 'bg-[#15BCDF] border-[#15BCDF] text-white' : 'border-slate-300 dark:border-white/10 text-slate-500'}`}>{level}</button>)}</div></div>
      {filtered.length === 0 ? <p className="py-14 text-center text-sm text-slate-500 italic">No security events yet.</p> : <div className="divide-y divide-slate-200 dark:divide-white/5">{filtered.map(item => <button key={item._id} onClick={() => setSelected(item)} className="w-full p-4 sm:px-6 text-left hover:bg-slate-100/60 dark:hover:bg-white/[.03] flex items-start gap-4"><span className="font-mono text-[10px] text-slate-400 pt-1">{new Date(item.createdAt).toLocaleTimeString('en-IN')}</span><span className={`text-[9px] font-bold px-2 py-1 rounded border ${severityClass[item.severity]}`}>{item.severity}</span><div className="min-w-0"><p className="text-xs font-bold text-[#2b3033] dark:text-white">{item.type}</p><p className="text-xs text-slate-500 mt-1 truncate">{item.message}</p></div></button>)}</div>}
    </section>
    {selected && <EventModal event={selected} onClose={() => setSelected(null)}/>}
  </div>;
}

function Info({ label, value }) { return <div><p className="text-[9px] uppercase tracking-widest font-bold text-slate-400">{label}</p><p className="text-xs font-bold text-[#2b3033] dark:text-white mt-1 break-all">{value}</p></div>; }

function VerificationResult({ result }) {
  const verified = result.success && result.result === 'VERIFIED';
  const mismatch = result.result === 'AMOUNT_MISMATCH';
  return <div role="status" className={`mt-5 p-4 rounded-lg border text-sm ${verified ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}><p className="font-bold uppercase tracking-wider">{verified ? 'Verified ✓' : mismatch ? 'Amount Mismatch' : 'Not Verified'}</p>{verified && <div className="grid sm:grid-cols-4 gap-3 mt-3 text-xs"><span>Amount<br/><b>₹{result.verification.amount}</b></span><span>Merchant<br/><b>{result.verification.merchantId}</b></span><span>Gateway<br/><b>{show(result.verification.gatewayStatus)}</b></span><span>TrustPay<br/><b>{result.verification.trustpayStatus.toUpperCase()}</b></span></div>}{mismatch && <p className="mt-2 text-xs">Claimed ₹{result.claimedAmount} · Verified ₹{result.verifiedAmount}</p>}{!verified && !mismatch && <p className="mt-2 text-xs">{result.message || 'This record is not verified.'}</p>}</div>;
}

function EventModal({ event, onClose }) {
  return <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center" role="dialog" aria-modal="true" onMouseDown={onClose}><div className="w-full max-w-lg bg-white dark:bg-[#1a1c1e] border border-slate-300 dark:border-white/10 rounded-xl shadow-2xl" onMouseDown={e => e.stopPropagation()}><div className="p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between"><div><p className="text-[9px] text-[#15BCDF] font-bold uppercase tracking-widest">Security Event</p><h2 className="font-bold text-[#2b3033] dark:text-white mt-1">{event.type}</h2></div><button onClick={onClose} aria-label="Close"><X className="w-5 h-5"/></button></div><div className="p-5 grid grid-cols-2 gap-5">{[['Severity', event.severity], ['Merchant', event.merchantId], ['Action', event.status], ['Created At', dateTime(event.createdAt)], ['Payment ID', show(event.paymentId)], ['Order ID', show(event.orderId)], ['Transaction ID', show(event.transactionId)], ['Event ID', event.eventId]].map(([label, value]) => <Info key={label} label={label} value={value}/>)}<div className="col-span-2 p-3 rounded-lg bg-slate-100 dark:bg-black/25 text-xs text-slate-600 dark:text-slate-300">{event.message}</div></div></div></div>;
}
