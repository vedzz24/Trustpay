import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react';
import { createRazorpayOrder, fetchPublicMerchant, verifyRazorpayPayment } from '../utils/api';

const MAX_AMOUNT = 1000000;
const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay Checkout could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = CHECKOUT_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'));
    document.body.appendChild(script);
  });
}

export default function CustomerPay() {
  const { merchantId } = useParams();
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [merchantError, setMerchantError] = useState(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');
  const [stage, setStage] = useState('form');
  const [verified, setVerified] = useState(null);

  useEffect(() => {
    setLoading(true); setInvalid(false); setMerchantError(null); setMerchant(null); setStage('form'); setVerified(null);
    fetchPublicMerchant(merchantId).then(result => {
      if (result.success) return setMerchant(result.merchant);
      if (result.httpStatus === 404) return setInvalid(true);
      if (result.networkError) return setMerchantError('Connection error. TrustPay could not reach the payment service. Check that the phone and TrustPay server are on the same network.');
      setMerchantError('TrustPay could not verify this merchant because the payment service is currently unavailable.');
    }).catch(() => setMerchantError('Connection error. TrustPay could not reach the payment service.')).finally(() => setLoading(false));
  }, [merchantId]);

  const submit = async event => {
    event.preventDefault();
    const numeric = Number(amount);
    if (!amount.trim() || !Number.isFinite(numeric) || numeric <= 0) return setError('Enter an amount greater than ₹0.');
    if (numeric > MAX_AMOUNT) return setError(`Amount cannot exceed ₹${MAX_AMOUNT.toLocaleString('en-IN')}.`);
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) return setError('Amount can have at most two decimal places.');
    setError(''); setStage('creating');
    try {
      await loadCheckoutScript();
      const order = await createRazorpayOrder(merchantId, numeric, reference.trim());
      if (!order.success) throw new Error(order.message || 'Unable to create payment order.');
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: 'TrustPay', description: `Payment to ${order.merchant.businessName}`,
        order_id: order.razorpayOrderId,
        handler: async gatewayResponse => {
          setStage('verifying');
          try {
            const result = await verifyRazorpayPayment(gatewayResponse);
            if (!result.success || result.status !== 'verified') throw new Error(result.message || 'Payment verification failed.');
            setVerified(result); setStage('verified');
          } catch (verificationError) {
            setError(verificationError.message || 'Payment was not verified.'); setStage('failed');
          }
        },
        modal: { ondismiss: () => { setError('Payment was cancelled. No verified payment was recorded.'); setStage('failed'); } },
        theme: { color: '#15BCDF' },
      });
      checkout.on('payment.failed', response => {
        setError(response.error?.description || 'Razorpay reported a failed payment.'); setStage('failed');
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message || 'Unable to start Razorpay Checkout.'); setStage('failed');
    }
  };

  const shell = 'min-h-screen bg-[#F2F1F0] dark:bg-[#111] px-4 py-8 sm:py-12 font-sans text-[#2b3033] dark:text-white';
  const card = 'w-full max-w-md mx-auto bg-white/80 dark:bg-[#1a1c1e] border border-slate-300 dark:border-white/10 rounded-2xl shadow-xl p-6 sm:p-8';
  if (loading) return <div className={`${shell} grid place-items-center`}><p className="text-sm text-slate-500">Verifying TrustPay merchant…</p></div>;
  if (merchantError) return <div className={`${shell} grid place-items-center`}><main className={`${card} text-center`}><AlertTriangle className="w-12 h-12 text-amber-500 mx-auto"/><h1 className="text-xl font-black uppercase tracking-wider mt-5">Payment Service Unavailable</h1><p className="text-sm text-slate-500 mt-3">{merchantError}</p><button onClick={() => window.location.reload()} className="mt-6 w-full py-3 rounded-lg border border-slate-300 dark:border-white/10 text-xs font-bold uppercase tracking-wider">Try Again</button></main></div>;
  if (invalid || !merchant) return <div className={`${shell} grid place-items-center`}><main className={`${card} text-center`}><AlertTriangle className="w-12 h-12 text-red-500 mx-auto"/><h1 className="text-xl font-black uppercase tracking-wider mt-5">Invalid TrustPay Merchant</h1><p className="text-sm text-slate-500 mt-3">This merchant could not be verified.</p><p className="text-sm font-bold text-red-500 mt-2">Do not continue with payment.</p></main></div>;

  return <div className={shell}><main className={card}>
    <div className="text-center"><div className="flex items-center justify-center gap-2"><ShieldCheck className="w-7 h-7 text-[#15BCDF]"/><span className="text-xl font-black tracking-[.18em]">TRUSTPAY</span></div><div className="inline-flex items-center gap-1.5 mt-5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-bold uppercase tracking-wider">Razorpay Test Mode</div><div className="mt-3"><span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 className="w-3.5 h-3.5"/>Registered Merchant</span></div><h1 className="text-2xl font-bold mt-5">{merchant.businessName}</h1><p className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-4">Merchant ID</p><p className="font-bold text-[#15BCDF] mt-1">{merchant.merchantId}</p></div>
    {stage === 'form' && <form onSubmit={submit} className="mt-8 space-y-5"><label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Amount</span><div className="mt-2 flex items-center rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 focus-within:ring-1 focus-within:ring-[#15BCDF]"><span className="pl-4 font-bold">₹</span><input required inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" max={MAX_AMOUNT} step="0.01" type="number" className="w-full px-3 py-3 bg-transparent outline-none" placeholder="0.00"/></div></label><label className="block"><span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Bill Reference</span><input value={reference} onChange={e => setReference(e.target.value.slice(0, 100))} maxLength={100} className="mt-2 w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-black/25 outline-none focus:ring-1 focus:ring-[#15BCDF]" placeholder="Optional"/></label>{error && <p role="alert" className="text-xs font-semibold text-red-500">{error}</p>}<button className="w-full py-3.5 rounded-lg bg-[#15BCDF] hover:bg-[#3fd0ef] text-white text-xs font-bold uppercase tracking-wider">Continue to Payment</button></form>}
    {(stage === 'creating' || stage === 'verifying') && <section className="mt-10 text-center"><LoaderCircle className="w-10 h-10 animate-spin text-[#15BCDF] mx-auto"/><h2 className="mt-5 font-black uppercase tracking-wider">{stage === 'creating' ? 'Opening Test Checkout…' : 'Verifying Payment…'}</h2><p className="text-sm text-slate-500 mt-2">{stage === 'verifying' ? 'Payment submitted. TrustPay is verifying the transaction.' : 'Creating a trusted payment order.'}</p></section>}
    {stage === 'verified' && <section className="mt-9 text-center"><CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto"/><h2 className="mt-4 text-xl font-black uppercase">Payment Verified ✓</h2><p className="text-3xl font-black mt-5">₹{Number(verified.amount).toLocaleString('en-IN')}</p><div className="mt-6 divide-y divide-slate-200 dark:divide-white/5">{[['Paid to', merchant.businessName], ['TrustPay ID', verified.trustpayTransactionId], ['Gateway', 'Razorpay'], ['Status', 'VERIFIED']].map(([label, value]) => <div key={label} className="flex justify-between gap-5 py-3 text-sm"><span className="text-slate-500">{label}</span><strong>{value}</strong></div>)}</div></section>}
    {stage === 'failed' && <section className="mt-9 text-center"><XCircle className="w-12 h-12 text-red-500 mx-auto"/><h2 className="mt-4 text-xl font-black uppercase">Payment Not Verified</h2><p role="alert" className="text-sm text-red-500 mt-3">{error}</p><button onClick={() => { setError(''); setStage('form'); }} className="mt-6 w-full py-3 rounded-lg border border-slate-300 dark:border-white/10 text-xs font-bold uppercase tracking-wider">Try Again</button></section>}
    <p className="mt-7 text-center text-[10px] text-slate-500">Test Mode does not transfer real money. Merchant identity is resolved by TrustPay.</p>
  </main></div>;
}
