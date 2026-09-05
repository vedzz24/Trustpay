import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode, ShieldCheck } from 'lucide-react';
import { fetchMerchantProfile } from '../utils/api';

const publicAppUrl = () => (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, '');

export default function MerchantQr() {
  const canvasRef = useRef(null);
  const [merchant, setMerchant] = useState(null);
  const [error, setError] = useState('');
  const paymentUrl = merchant ? `${publicAppUrl()}/pay/${merchant.merchantId}` : '';

  useEffect(() => {
    fetchMerchantProfile().then(result => {
      if (result.httpStatus === 401 || result.httpStatus === 403) {
        setError('Your session has expired. Redirecting to login…');
        window.dispatchEvent(new Event('trustpay:session-expired'));
        return;
      }
      if (result.httpStatus === 404) {
        setError('Merchant profile endpoint is unavailable. Restart the TrustPay backend and try again.');
        return;
      }
      if (!result.success || !result.user?.merchantId) {
        setError(result.message || 'Unable to load your authenticated merchant profile.');
        return;
      }
      setMerchant(result.user);
      setError('');
    }).catch(() => setError('Unable to connect to the TrustPay backend.'));
  }, []);

  useEffect(() => {
    if (!paymentUrl || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, paymentUrl, {
      width: 280, margin: 2,
      color: { dark: '#111827', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).catch(() => setError('Unable to generate QR code.'));
  }, [paymentUrl]);

  const download = () => {
    if (!canvasRef.current || !merchant) return;
    const link = document.createElement('a');
    link.download = `TrustPay-${merchant.merchantId}-QR.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const print = () => {
    if (!canvasRef.current || !merchant) return;
    const popup = window.open('', '_blank', 'width=640,height=760');
    if (!popup) return setError('Allow pop-ups to print your QR card.');
    const qrImage = canvasRef.current.toDataURL('image/png');
    popup.document.write(`<!doctype html><html><head><title>TrustPay ${merchant.merchantId}</title><style>body{margin:0;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;color:#111827}.card{text-align:center;border:2px solid #15BCDF;border-radius:20px;padding:38px;width:360px}.brand{font-size:25px;font-weight:900;letter-spacing:4px}.business{font-size:22px;font-weight:800;margin:24px 0 6px}.label{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#64748b}.id{font-size:16px;font-weight:800;margin:5px 0 20px}.qr{width:280px;height:280px}.scan{font-size:13px;font-weight:900;letter-spacing:3px;margin-top:18px;color:#0891b2}.permanent{font-size:10px;color:#64748b;margin-top:8px}@media print{.card{break-inside:avoid}}</style></head><body><div class="card"><div class="brand">TRUSTPAY</div><div class="business">${escapeHtml(merchant.businessName)}</div><div class="label">Merchant ID</div><div class="id">${escapeHtml(merchant.merchantId)}</div><img class="qr" src="${qrImage}"/><div class="scan">SCAN TO PAY</div><div class="permanent">Permanent Merchant QR</div></div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  const card = 'bg-white/70 dark:bg-[#1a1c1e] border border-slate-300 dark:border-white/10 rounded-2xl shadow-sm';
  return <div className="max-w-5xl mx-auto px-4 py-10 min-h-[75vh]">
    <header className="mb-8"><p className="text-[10px] font-bold uppercase tracking-[.24em] text-[#15BCDF]">Permanent payment identity</p><h1 className="text-3xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white mt-2">My QR</h1><p className="text-sm text-slate-500 mt-1">One TrustPay QR for every customer payment.</p></header>
    {error ? <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div> : !merchant ? <div className={`${card} p-16 text-center text-slate-500`}>Loading permanent QR…</div> : <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
      <section className={`${card} p-6 sm:p-8 flex justify-center`}>
        <div className="w-full max-w-sm bg-white rounded-2xl border-2 border-[#15BCDF] p-7 text-center text-slate-900">
          <div className="flex items-center justify-center gap-2"><ShieldCheck className="w-6 h-6 text-[#15BCDF]"/><span className="text-xl font-black tracking-[.18em]">TRUSTPAY</span></div>
          <h2 className="text-xl font-bold mt-6">{merchant.merchantName || merchant.name}</h2><p className="text-sm text-slate-500 mt-1">{merchant.businessName}</p><p className="text-[9px] uppercase tracking-widest text-slate-500 mt-4">Merchant ID</p><p className="font-bold mt-1">{merchant.merchantId}</p><p className="text-[9px] uppercase tracking-widest text-slate-500 mt-3">UPI ID</p><p className="text-sm font-semibold mt-1">{merchant.upiId}</p>
          <div className="mt-5 inline-block p-2 bg-white border border-slate-200 rounded-xl"><canvas ref={canvasRef} aria-label={`Permanent payment QR for ${merchant.businessName}`}/></div>
          <p className="text-xs font-black tracking-[.22em] text-cyan-600 mt-5">SCAN TO PAY</p><p className="text-[10px] text-slate-500 mt-2">Permanent Merchant QR</p>
        </div>
      </section>
      <aside className={`${card} p-6 space-y-4`}><div className="w-11 h-11 rounded-xl bg-[#15BCDF]/10 text-[#15BCDF] grid place-items-center"><QrCode className="w-5 h-5"/></div><div><p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold">Payment URL</p><p className="text-xs text-[#2b3033] dark:text-white font-mono break-all mt-2">{paymentUrl}</p></div><p className="text-xs text-slate-500 leading-relaxed">This QR contains only your public TrustPay payment URL. It does not contain your email, token, password, or database details.</p><button onClick={download} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#15BCDF] text-white text-xs font-bold uppercase tracking-wider"><Download className="w-4 h-4"/>Download QR</button><button onClick={print} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 text-[#2b3033] dark:text-white text-xs font-bold uppercase tracking-wider"><Printer className="w-4 h-4"/>Print QR</button></aside>
    </div>}
  </div>;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
