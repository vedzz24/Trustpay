/* eslint-disable react/prop-types, react/no-unescaped-entities */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, Check, CheckCircle2, Clock3, Eye, LoaderCircle, Plus, ShieldCheck, UserRound, Users, X } from 'lucide-react';
import { acceptUserGuardianRequest, fetchGuardianAlerts, fetchGuardianDashboard, fetchGuardianLinkRequests, fetchProtectedUsers, fetchUserGuardianRequests, loginGuardian, registerGuardian, rejectUserGuardianRequest, removeProtectedUser, resolveGuardianAlert, sendGuardianLinkRequest, getApiUrl, subscribeGuardianPush } from '../utils/api';
import InstallPrompt from '../components/InstallPrompt';

const shell = 'min-h-[calc(100vh-5rem)] bg-[#F2F1F0] dark:bg-[#111] text-[#2b3033] dark:text-white px-4 py-8 sm:py-12 font-sans simple:text-lg';
const card = 'rounded-xl border border-slate-300 dark:border-white/10 bg-white/70 dark:bg-[#1a1c1e] p-5 sm:p-6 simple:p-8 shadow-sm transition-colors';
const input = 'w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/20 px-4 py-3 simple:py-4 text-sm simple:text-base outline-none transition focus:border-[#15BCDF] focus:ring-2 focus:ring-[#15BCDF]/20';
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#15BCDF] px-5 py-3 simple:py-5 text-xs simple:text-base font-black uppercase tracking-wider text-[#111] transition hover:shadow-[0_0_22px_rgba(21,188,223,.24)] disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2.5 simple:py-4 text-xs simple:text-base font-bold uppercase tracking-wider transition hover:border-[#15BCDF]';
const fmt = value => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No activity yet';

function GuardianHeader({ title, subtitle }) {
  return <header className="mx-auto max-w-6xl"><div className="flex items-center gap-3"><span className="grid h-11 w-11 simple:h-16 simple:w-16 place-items-center rounded-lg bg-[#15BCDF]/15 text-[#15BCDF]"><ShieldCheck className="h-6 w-6 simple:h-8 simple:w-8" aria-hidden="true"/></span><div><p className="text-[11px] simple:text-xs font-black tracking-[.2em] text-[#15BCDF]">GUARDX GUARDIAN</p><h1 className="text-2xl font-black uppercase tracking-wider sm:text-3xl simple:text-4xl">{title}</h1></div></div><p className="mt-3 max-w-3xl text-sm simple:text-lg leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p></header>;
}

function Loading() { return <div className={`${shell} grid place-items-center`}><LoaderCircle className="h-7 w-7 animate-spin text-[#15BCDF]" aria-label="Loading"/></div>; }
function ErrorCard({ message, retry }) { return <section className={`${card} mx-auto mt-8 max-w-xl text-center`}><AlertTriangle className="mx-auto h-7 w-7 text-red-500"/><p className="mt-3 text-sm">{message}</p><button onClick={retry} className={`${primary} mt-5`}>Retry</button></section>; }

function AlertCard({ alert, onResolve, compact = false }) {
  const riskClass = alert.riskLevel === 'CRITICAL' || alert.riskLevel === 'HIGH' ? 'text-red-500 border-red-500/30 bg-red-500/10' : alert.riskLevel === 'MEDIUM' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 'text-blue-400 border-blue-400/30 bg-blue-400/10';
  return <article className={`${card} hover:border-[#15BCDF]/50`}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Protected User</p><h3 className="mt-1 font-black uppercase tracking-wide">{alert.protectedUser?.name || 'GuardX User'}</h3><p className="mt-1 text-sm text-slate-500">{alert.protectedUser?.email}</p></div><span className={`rounded-full border px-3 py-1 text-[10px] font-black tracking-wider ${riskClass}`}>{alert.riskLevel}</span></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-slate-500">Alert Type</span><p className="font-bold">{alert.alertType}</p></div><div><span className="text-slate-500">Status</span><p className={alert.status === 'resolved' ? 'font-bold text-emerald-500' : 'font-bold text-red-500'}>{alert.status?.toUpperCase()}</p></div></div><p className="mt-4 text-sm leading-6">{alert.reason}</p>{!compact && (alert.transactionId || alert.qrInfo) && <div className="mt-4 rounded-lg border border-white/5 bg-black/10 p-3 text-xs text-slate-500">{alert.transactionId && <p>Transaction: {alert.transactionId}</p>}{alert.qrInfo && <p className="mt-1">QR: {alert.qrInfo}</p>}</div>}<div className="mt-5 flex flex-wrap items-center gap-3"><span className="mr-auto text-xs text-slate-500">{fmt(alert.createdAt)}</span><Link to={`/guardian/alerts?alert=${encodeURIComponent(alert.alertId || alert.id)}`} className={secondary}><Eye className="h-4 w-4"/>View Details</Link>{onResolve && alert.status !== 'resolved' && <button onClick={() => onResolve(alert.alertId || alert.id)} className={primary}><Check className="h-4 w-4"/>Mark Resolved</button>}</div></article>;
}

export function GuardianAccount({ register = false, setUser }) {
  const navigate = useNavigate(); const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' }); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const submit = async event => { event.preventDefault(); setError(''); if (register && form.password !== form.confirmPassword) return setError('Passwords do not match.'); setLoading(true); const response = register ? await registerGuardian(form.name, form.email, form.password, form.confirmPassword, form.phone) : await loginGuardian(form.email, form.password); setLoading(false); if (!response.success) return setError(response.message); setUser?.(response.user); navigate('/guardian/dashboard', { replace: true }); };
  return <div className={shell}><GuardianHeader title={register ? 'Create Guardian Account' : 'Guardian Login'} subtitle="Monitor GuardX-generated security warnings only after a user explicitly accepts your protection request."/><main className="mx-auto mt-8 max-w-md"><form onSubmit={submit} className={`${card} space-y-4`}>{register && <><label className="block text-xs font-bold uppercase tracking-wider">Full Name<input required autoComplete="name" className={`${input} mt-2`} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label className="block text-xs font-bold uppercase tracking-wider">Phone Number (Optional)<input type="tel" autoComplete="tel" className={`${input} mt-2`} placeholder="+919876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></label></>}<label className="block text-xs font-bold uppercase tracking-wider">Email<input required type="email" autoComplete="email" className={`${input} mt-2`} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}/></label><label className="block text-xs font-bold uppercase tracking-wider">Password<input required minLength={8} maxLength={128} type="password" autoComplete={register ? 'new-password' : 'current-password'} className={`${input} mt-2`} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}/></label>{register && <label className="block text-xs font-bold uppercase tracking-wider">Confirm Password<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" className={`${input} mt-2`} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })}/></label>}{error && <p role="alert" className="text-sm text-red-500">{error}</p>}<button disabled={loading} className={`${primary} w-full`}>{loading ? 'Please wait…' : register ? 'Create Guardian Account' : 'Login'}</button><Link to={register ? '/guardian/login' : '/guardian/register'} className="block text-center text-xs font-bold text-[#15BCDF]">{register ? 'Already have a Guardian account?' : 'Create Guardian account'}</Link></form></main></div>;
}

export function GuardianAccept() { return <div className={shell}><GuardianHeader title="Guardian Requests Changed" subtitle="Protection requests are now initiated by Guardians and accepted securely inside the protected user's GuardX account."/><main className="mx-auto mt-8 max-w-xl"><section className={card}><Link className={primary} to="/guardian/login">Guardian Login</Link></section></main></div>; }

export function GuardianDashboard() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setError('');
    try {
      const response = await fetchGuardianDashboard();
      if (!response.success) throw new Error(response.message || 'Unable to load Guardian dashboard.');
      const legacyAlerts = Array.isArray(response.alerts) ? response.alerts : [];
      const recentAlerts = (Array.isArray(response.recentAlerts) ? response.recentAlerts : legacyAlerts).map(alert => ({
        ...alert,
        alertType: alert.alertType || alert.checkType || 'Security Alert',
        reason: alert.reason || alert.summary || 'GuardX detected suspicious activity.',
        status: alert.status === 'reviewed' ? 'resolved' : (alert.status || 'active'),
      }));
      setData({
        summary: {
          protectedUsers: Number(response.summary?.protectedUsers ?? response.protectedUserCount ?? response.protectedUsers?.length ?? 0),
          activeAlerts: Number(response.summary?.activeAlerts ?? recentAlerts.filter(alert => alert.status !== 'resolved').length),
          highRiskAlerts: Number(response.summary?.highRiskAlerts ?? response.activeHighRiskAlerts ?? recentAlerts.filter(alert => ['HIGH', 'CRITICAL'].includes(alert.riskLevel) && alert.status !== 'resolved').length),
          resolvedAlerts: Number(response.summary?.resolvedAlerts ?? recentAlerts.filter(alert => alert.status === 'resolved').length),
        },
        recentAlerts,
      });
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Unable to load Guardian dashboard.');
    }
  }, []);
  useEffect(() => { load(); }, [load]); if (!data && !error) return <Loading/>;
  const summaries = [['Protected Users', data?.summary.protectedUsers, Users], ['Active Alerts', data?.summary.activeAlerts, Bell], ['High Risk Alerts', data?.summary.highRiskAlerts, AlertTriangle], ['Resolved Alerts', data?.summary.resolvedAlerts, CheckCircle2]];
  
  const handleEnablePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        // In a real app, VAPID_PUBLIC_KEY would be passed from backend or env. 
        // We will hardcode or require it to be set in env for production.
        // For local development it might fail if we don't have it.
        const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLj-lM_zI1xM'; // Dummy placeholder, should be env var
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY
        });
        await subscribeGuardianPush(subscription);
        alert('Push notifications enabled!');
      } else {
        alert('Notification permission denied.');
      }
    } catch (err) {
      console.error('Failed to subscribe to push notifications', err);
      alert('Could not enable push notifications. Check console for details.');
    }
  };

  return <div className={shell}><InstallPrompt /><GuardianHeader title="Guardian Dashboard" subtitle="Security monitoring for users who have accepted your protection request. Guardian Mode does not stop GPay, PhonePe or bank transactions."/>{error ? <ErrorCard message={error} retry={load}/> : <main className="mx-auto mt-8 max-w-6xl"><div className="mb-6 flex justify-end"><button onClick={handleEnablePush} className={primary}><Bell className="h-4 w-4"/>Enable alert notifications</button></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{summaries.map(([label, value, Icon]) => <section key={label} className={`${card} group hover:border-[#15BCDF]/50`}><Icon className="h-5 w-5 text-[#15BCDF]"/><p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></section>)}</div><section className="mt-8"><h2 className="text-lg font-black uppercase tracking-wider">Recent Security Alerts</h2>{data.recentAlerts.length ? <div className="mt-4 grid gap-4 lg:grid-cols-2">{data.recentAlerts.map(alert => <AlertCard key={alert.alertId} alert={alert} compact/>)}</div> : <div className={`${card} mt-4 text-center`}><Bell className="mx-auto h-7 w-7 text-slate-500"/><p className="mt-3 text-sm text-slate-500">No security alerts from your protected users.</p></div>}</section></main>}</div>;
}

export function ProtectedUsers() {
  const [protectedUsers, setProtectedUsers] = useState([]); const [pendingRequests, setPendingRequests] = useState([]); const [open, setOpen] = useState(false); const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true); const [sending, setSending] = useState(false);
  const load = useCallback(async () => { setLoading(true); const [users, requests] = await Promise.all([fetchProtectedUsers(), fetchGuardianLinkRequests()]); if (users.success) setProtectedUsers(users.protectedUsers); if (requests.success) setPendingRequests(requests.pendingRequests); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);
  const send = async event => { event.preventDefault(); setSending(true); setMessage(''); const response = await sendGuardianLinkRequest(email); setSending(false); setMessage(response.message); if (response.success) { setEmail(''); await load(); } };
  const remove = async id => { if (!window.confirm('Remove this protection relationship? Future alerts will no longer be shared.')) return; const response = await removeProtectedUser(id); if (response.success) load(); };
  if (loading) return <Loading/>;
  return <div className={shell}><GuardianHeader title="Protected Users" subtitle="Link trusted family members or users whose GuardX security activity you want to monitor."/><main className="mx-auto mt-8 max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><section className={`${card} min-w-52`}><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Protected Users</p><p className="mt-2 text-3xl font-black">{protectedUsers.length}</p></section><button onClick={() => setOpen(true)} className={primary}><Plus className="h-4 w-4"/>Add Protected User</button></div>{pendingRequests.length > 0 && <section className="mt-8"><h2 className="font-black uppercase tracking-wider">Pending Requests</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{pendingRequests.map(request => <article key={request._id} className={card}><div className="flex items-start justify-between"><div><p className="font-black uppercase">{request.protectedUserName}</p><p className="mt-1 text-sm text-slate-500">{request.protectedUserEmail}</p></div><span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black text-amber-500">PENDING</span></div><p className="mt-4 text-xs text-slate-500">Sent {fmt(request.createdAt)}</p><button onClick={() => remove(request._id)} className={`${secondary} mt-4 text-red-500`}>Cancel Request</button></article>)}</div></section>}<section className="mt-8">{protectedUsers.length ? <div className="grid gap-4 lg:grid-cols-2">{protectedUsers.map(user => <article key={user.linkId} className={`${card} hover:border-[#15BCDF]/50`}><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#15BCDF]/15 text-[#15BCDF]">{user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover"/> : <UserRound/>}</span><div className="min-w-0"><h3 className="truncate font-black uppercase tracking-wide">{user.name}</h3><p className="truncate text-sm text-slate-500">{user.email}</p><p className="mt-2 text-xs font-bold text-emerald-500">● ACTIVE</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><p><span className="text-slate-500">Security Alerts</span><br/><strong>{user.securityAlerts}</strong></p><p><span className="text-slate-500">High Risk</span><br/><strong>{user.highRisk}</strong></p><p><span className="text-slate-500">Linked</span><br/><strong>{fmt(user.linkedAt)}</strong></p><p><span className="text-slate-500">Last Activity</span><br/><strong>{fmt(user.lastActivity)}</strong></p></div><div className="mt-5 flex flex-wrap gap-3"><Link to={`/guardian/alerts?user=${user.id}`} className={primary}>View Alerts</Link><button onClick={() => remove(user.linkId)} className={`${secondary} text-red-500`}>Remove</button></div></article>)}</div> : <div className={`${card} py-12 text-center`}><Users className="mx-auto h-8 w-8 text-slate-500"/><h2 className="mt-4 font-black uppercase tracking-wider">No Protected Users Yet</h2><p className="mt-2 text-sm text-slate-500">Add a trusted GuardX user using their registered email address.</p><button onClick={() => setOpen(true)} className={`${primary} mt-6`}><Plus className="h-4 w-4"/>Add Protected User</button></div>}</section></main>{open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="link-title" onMouseDown={e => e.target === e.currentTarget && setOpen(false)}><form onSubmit={send} className={`${card} relative w-full max-w-md animate-[fadeIn_.2s_ease-out] shadow-2xl`}><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-lg hover:bg-white/5"><X className="h-5 w-5"/></button><h2 id="link-title" className="pr-12 text-xl font-black uppercase tracking-wider">Link Protected User</h2><p className="mt-2 text-sm text-slate-500">The user must accept before any security alerts are shared.</p><label className="mt-6 block text-xs font-bold uppercase tracking-wider">Protected User Email<input autoFocus required type="email" placeholder="user@example.com" className={`${input} mt-2`} value={email} onChange={e => setEmail(e.target.value)}/></label>{message && <p role="status" className={`mt-4 text-sm ${message.includes('successfully') ? 'text-emerald-500' : 'text-red-500'}`}>{message}</p>}<button disabled={sending} className={`${primary} mt-5 w-full`}>{sending ? 'Sending…' : 'Send Link Request'}</button></form></div>}</div>;
}

export function GuardianAlerts({ addToast }) {
  const location = useLocation(); const detailId = new URLSearchParams(location.search).get('alert') || '';
  const [guardianAlerts, setGuardianAlerts] = useState([]); const [protectedUsers, setProtectedUsers] = useState([]); const [filter, setFilter] = useState('ALL'); const [userId, setUserId] = useState(() => new URLSearchParams(location.search).get('user') || ''); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const [alerts, users] = await Promise.all([fetchGuardianAlerts(), fetchProtectedUsers()]); if (alerts.success) setGuardianAlerts(alerts.guardianAlerts); if (users.success) setProtectedUsers(users.protectedUsers); setLoading(false); }, []);
  
  useEffect(() => { load(); }, [load]);
  
  useEffect(() => {
    let es = null;
    let reconnectTimeout = null;
    let backoff = 1000;
    
    const connect = () => {
      const token = localStorage.getItem('trustpay_token');
      if (!token) return;
      
      es = new EventSource(getApiUrl(`/guardian/alerts/stream?accessToken=${token}`));
      
      es.onmessage = e => {
        try {
          const newAlert = JSON.parse(e.data);
          setGuardianAlerts(prev => {
            if (prev.some(a => a.alertId === newAlert.alertId)) return prev;
            return [newAlert, ...prev];
          });
          if (addToast) addToast(`New ${newAlert.riskLevel} alert for ${newAlert.protectedUser?.name || 'user'}`, newAlert.riskLevel === 'CRITICAL' || newAlert.riskLevel === 'HIGH' ? 'error' : 'info');
        } catch (err) {
          console.error('SSE Error:', err);
        }
      };
      
      es.onerror = () => {
        es.close();
        reconnectTimeout = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 30000);
      };
      
      es.onopen = () => { backoff = 1000; };
    };
    
    connect();
    
    return () => {
      if (es) es.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [addToast]);

  const visible = useMemo(() => guardianAlerts.filter(alert => (!detailId || detailId === alert.alertId || detailId === String(alert.id)) && (!userId || String(alert.protectedUserId) === userId) && (filter === 'ALL' || filter === 'RESOLVED' ? filter === 'ALL' || alert.status === 'resolved' : filter === 'HIGH RISK' ? ['HIGH', 'CRITICAL'].includes(alert.riskLevel) : alert.riskLevel === filter)), [guardianAlerts, detailId, filter, userId]);
  const resolve = async id => { const response = await resolveGuardianAlert(id); if (response.success) load(); };
  if (loading) return <Loading/>;
  return <div className={shell}><GuardianHeader title="Security Alerts" subtitle="Security warnings generated from activity detected on your protected GuardX users."/><main className="mx-auto mt-8 max-w-6xl">{detailId && <div className="mb-4 flex items-center justify-between rounded-lg border border-[#15BCDF]/30 bg-[#15BCDF]/10 p-3 text-sm"><strong>Alert details</strong><Link to="/guardian/alerts" className="text-xs font-bold uppercase tracking-wider text-[#15BCDF]">Back to all alerts</Link></div>}<div className="flex flex-wrap gap-2">{['ALL', 'HIGH RISK', 'MEDIUM', 'LOW', 'RESOLVED'].map(value => <button key={value} onClick={() => setFilter(value)} aria-pressed={filter === value} className={`${secondary} ${filter === value ? 'border-[#15BCDF] bg-[#15BCDF]/10 text-[#15BCDF]' : ''}`}>{value}</button>)}<select aria-label="Filter by protected user" className={`${input} ml-auto w-full sm:w-64`} value={userId} onChange={e => setUserId(e.target.value)}><option value="">ALL PROTECTED USERS</option>{protectedUsers.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>{visible.length ? <div className="mt-6 grid gap-4 lg:grid-cols-2">{visible.map(alert => <AlertCard key={alert.alertId} alert={alert} onResolve={resolve}/>)}</div> : <div className={`${card} mt-6 py-12 text-center`}><Bell className="mx-auto h-8 w-8 text-slate-500"/><h2 className="mt-4 font-black uppercase tracking-wider">No Security Alerts</h2><p className="mt-2 text-sm text-slate-500">No suspicious activity has been reported for your protected users.</p></div>}</main></div>;
}

export function GuardianAbout() { return <div className={shell}><GuardianHeader title="About Guardian Mode" subtitle="GuardX Guardian is a consent-based security monitoring feature, not a banking control tool."/><main className="mx-auto mt-8 max-w-4xl"><section className={card}><h2 className="font-black uppercase tracking-wider">Privacy by Design</h2><p className="mt-4 text-sm leading-7 text-slate-500 dark:text-slate-400">Guardians receive only GuardX-generated security alerts and limited context needed for fraud protection. They cannot see passwords, OTPs, complete banking information, initiate transactions, approve UPI payments, or control a protected user's bank account.</p><div className="mt-6 rounded-lg border border-[#15BCDF]/25 bg-[#15BCDF]/10 p-4 text-sm font-bold">Guardian Mode does not stop GPay, PhonePe or bank transactions.</div></section></main></div>; }

export function UserGuardianProtection() {
  const [requests, setRequests] = useState([]); const [loading, setLoading] = useState(true); const [notice, setNotice] = useState('');
  const load = useCallback(async () => { setLoading(true); const response = await fetchUserGuardianRequests(); if (response.success) setRequests(response.guardianRequests); setLoading(false); }, []); useEffect(() => { load(); }, [load]);
  const decide = async (id, accepted) => { const response = accepted ? await acceptUserGuardianRequest(id) : await rejectUserGuardianRequest(id); setNotice(response.message); if (response.success) load(); };
  if (loading) return <Loading/>;
  return <div className={shell}><GuardianHeader title="Guardian Requests" subtitle="You stay in control. A Guardian receives no access unless you explicitly accept their request."/><main className="mx-auto mt-8 max-w-3xl">{notice && <p role="status" className="mb-4 rounded-lg border border-[#15BCDF]/30 bg-[#15BCDF]/10 p-3 text-sm">{notice}</p>}{requests.length ? <div className="space-y-4">{requests.map(request => <article key={request._id} className={card}><p className="text-lg font-black">{request.guardianName} wants to protect your GuardX account.</p><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-slate-500">Guardian Name</span><br/><strong>{request.guardianName}</strong></p><p><span className="text-slate-500">Guardian Email</span><br/><strong>{request.guardianEmail}</strong></p><p><span className="text-slate-500">Request Date</span><br/><strong>{fmt(request.createdAt)}</strong></p></div><div className="mt-6 flex flex-wrap gap-3"><button onClick={() => decide(request._id, true)} className={primary}><Check className="h-4 w-4"/>Accept</button><button onClick={() => decide(request._id, false)} className={`${secondary} text-red-500`}><X className="h-4 w-4"/>Reject</button></div></article>)}</div> : <section className={`${card} text-center`}><Clock3 className="mx-auto h-8 w-8 text-slate-500"/><h2 className="mt-4 font-black uppercase tracking-wider">No Pending Guardian Requests</h2><p className="mt-2 text-sm text-slate-500">New protection requests will appear here for your approval.</p></section>}<section className={`${card} mt-5`}><p className="text-sm text-slate-500">Guardian Mode shares only GuardX security alerts. It never shares passwords, OTPs, full bank details, or transaction controls.</p></section></main></div>;
}
