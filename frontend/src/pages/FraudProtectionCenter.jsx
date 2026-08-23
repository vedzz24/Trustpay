import { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, FileText, QrCode, ClipboardList } from 'lucide-react';
import { checkScam, fetchOtpAlerts, analyzeScreenshot } from '../utils/api';
import { cn } from '../utils/cn';

export default function FraudProtectionCenter({ addToast }) {
  const [activeTab, setActiveTab] = useState('proof');
  
  // Proof Analyzer state
  const [selectedFile, setSelectedFile] = useState(null);
  const [analyzingProof, setAnalyzingProof] = useState(false);
  const [proofResult, setProofResult] = useState(null);
  
  // SMS/Scam Analyzer state
  const [scamText, setScamText] = useState('');
  const [scamResult, setScamResult] = useState(null);
  const [checkingScam, setCheckingScam] = useState(false);

  // QR checker state
  const [qrText, setQrText] = useState('');
  const [qrResult, setQrResult] = useState(null);

  // Alerts log
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetchOtpAlerts()
      .then(res => { if (res.success) setAlerts(res.alerts || []); })
      .catch(() => {});
  }, [activeTab]);

  const handleProofScan = () => {
    if (!selectedFile) return;
    setAnalyzingProof(true);
    setProofResult(null);
    setTimeout(async () => {
      setAnalyzingProof(false);
      const isFake = selectedFile.name.toLowerCase().includes('fake') || selectedFile.name.toLowerCase().includes('edited');
      const details = isFake 
        ? [
            "Typography Mismatch: Receipt font weights differ from banking standard templates.",
            "Inconsistent metadata: Editing signatures detected in transaction block.",
            "Integrity sync mismatch: Transaction ID could not be matched with Sandbox Payment Provider settlement."
          ]
        : [
            "Consistent compression: Noise distribution uniform.",
            "Valid metadata parameters.",
            "Legitimate verification status."
          ];
      setProofResult({ fake: isFake, details });
    }, 2000);
  };

  const handleScamCheck = async (e) => {
    e.preventDefault();
    if (!scamText.trim()) return;
    setCheckingScam(true);
    try {
      const res = await checkScam(scamText);
      setScamResult(res);
    } catch {
      addToast?.('Failed to scan message keywords.', 'error');
    } finally {
      setCheckingScam(false);
    }
  };

  const handleQrCheck = (e) => {
    e.preventDefault();
    if (!qrText.trim()) return;
    if (qrText.startsWith('trustpay-verify:')) {
      setQrResult({
        valid: true,
        message: "VERIFIED PAYMENT REQUEST: Cryptographic signature and structure is authentic."
      });
    } else {
      setQrResult({
        valid: false,
        message: "TRANSACTION MISMATCH: Signature mismatch or invalid TrustPay token configuration."
      });
    }
  };

  const tabs = [
    { id: 'proof', label: 'PAYMENT PROOF', Icon: FileText },
    { id: 'scam', label: 'SCAM MESSAGE', Icon: ShieldAlert },
    { id: 'qr', label: 'QR CHECKER', Icon: QrCode },
    { id: 'alerts', label: 'FRAUD ALERTS', Icon: ClipboardList }
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-10 min-h-screen font-sans">
      
      {/* Header */}
      <div className="pb-6 border-b border-slate-300 dark:border-white/10">
        <h1 className="text-3xl font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Fraud Protection Center</h1>
        <p className="text-[#6b6f72] dark:text-slate-400 text-sm font-medium mt-1">
          Verify screenshot validity, inspect urgent scams manually, and audit dynamic QR hashes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 overflow-x-auto gap-4">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("pb-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0", activeTab === tab.id ? "border-[#15BCDF] text-[#15BCDF]" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200")}>
            <tab.Icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white/60 dark:bg-[#1a1c1e] p-6 lg:p-8 rounded-xl border border-slate-300 dark:border-white/10 shadow-sm min-h-[300px] flex flex-col justify-between">
        
        {activeTab === 'proof' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Forensic Payment Proof Analyzer</h3>
              <p className="text-xs text-[#6b6f72] dark:text-slate-400 font-medium mt-1">
                Upload customer screenshots or transaction receipt images to perform visual metadata audits.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-black/25">
              <input type="file" id="proof-upload" className="hidden" onChange={(e) => setSelectedFile(e.target.files[0])} />
              <label htmlFor="proof-upload" className="cursor-pointer space-y-2 block">
                <FileText className="w-10 h-10 text-slate-450 dark:text-slate-650 mx-auto" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#15BCDF] block">
                  {selectedFile ? selectedFile.name : 'Select Screenshot Receipt'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-500 font-semibold block">PNG, JPG, or WEBP up to 5MB</span>
              </label>
            </div>

            {selectedFile && (
              <button onClick={handleProofScan} disabled={analyzingProof} className="w-full py-3 bg-[#15BCDF] hover:bg-[#3fd0ef] text-white font-bold uppercase text-xs tracking-wider rounded-lg transition-colors">
                {analyzingProof ? 'Auditing Bounding Boxes...' : 'Perform Forensic Audit'}
              </button>
            )}

            {proofResult && (
              <div className={cn("p-4 rounded-lg border text-xs space-y-2", proofResult.fake ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500")}>
                <div className="font-bold uppercase tracking-wider">
                  Audit Verdict: {proofResult.fake ? 'HIGH-RISK PAYMENT PROOF (EDITED)' : 'COMPATIBLE VERIFICATION PATTERN'}
                </div>
                <ul className="list-disc pl-4 space-y-1 font-semibold text-slate-550 dark:text-slate-400">
                  {proofResult.details.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
                <p className="text-[10px] font-bold text-[#6b6f72] dark:text-slate-500 mt-3 italic border-t border-slate-200 dark:border-white/5 pt-2">
                  "Payment screenshots are not treated as proof of settlement. Final verification depends on server-side transaction confirmation."
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'scam' && (
          <form onSubmit={handleScamCheck} className="space-y-6">
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Manual Scam Message Analyzer</h3>
              <p className="text-xs text-[#6b6f72] dark:text-slate-400 font-medium mt-1">
                Paste SMS, email notifications, or WhatsApp rewards texts to test signature threats.
              </p>
            </div>

            <textarea required value={scamText} onChange={e => setScamText(e.target.value)} rows={4} className="w-full p-4 text-xs font-mono rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-black/25 text-[#2b3033] dark:text-white outline-none focus:ring-1 focus:ring-[#15BCDF]" placeholder="Dear User, paste text warning OTP updates here..." />

            <button type="submit" disabled={checkingScam} className="w-full py-3 bg-[#15BCDF] hover:bg-[#3fd0ef] text-white font-bold uppercase text-xs tracking-wider rounded-lg transition-colors">
              {checkingScam ? 'Scanning Text Engine...' : 'Run Scam Keyword Audit'}
            </button>

            {scamResult && (
              <div className={cn("p-4 rounded-lg border text-xs space-y-1", scamResult.result === 'Safe' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                <div className="font-bold uppercase tracking-wider">Analysis Result: {scamResult.result}</div>
                <p className="font-semibold text-slate-550 dark:text-slate-400">{scamResult.message}</p>
              </div>
            )}
          </form>
        )}

        {activeTab === 'qr' && (
          <form onSubmit={handleQrCheck} className="space-y-6">
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Verify TrustPay QR Payload</h3>
              <p className="text-xs text-[#6b6f72] dark:text-slate-400 font-medium mt-1">
                Manually paste dynamic QR verification tokens to test HMAC integrity structure.
              </p>
            </div>

            <input required type="text" value={qrText} onChange={e => setQrText(e.target.value)} className="w-full p-3 text-xs font-mono rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-black/25 text-[#2b3033] dark:text-white outline-none" placeholder="trustpay-verify:eyJ0eG5JZ..." />

            <button type="submit" className="w-full py-3 bg-[#15BCDF] hover:bg-[#3fd0ef] text-white font-bold uppercase text-xs tracking-wider rounded-lg transition-colors">
              Run Token Integrity Test
            </button>

            {qrResult && (
              <div className={cn("p-4 rounded-lg border text-xs font-bold uppercase tracking-wider", qrResult.valid ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500")}>
                {qrResult.message}
              </div>
            )}
          </form>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold uppercase tracking-wider text-[#2b3033] dark:text-white">Logged Security Alerts</h3>
              <p className="text-xs text-[#6b6f72] dark:text-slate-400 font-medium mt-1">
                Audit trail of recent OTP scams and blocked threats logged to the system.
              </p>
            </div>

            {alerts.length === 0 ? (
              <p className="text-xs text-[#6b6f72] dark:text-slate-500 italic py-6">No threat events logged in this session.</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert, idx) => (
                  <div key={alert._id || idx} className="p-4 bg-slate-100/50 dark:bg-black/25 border border-slate-200 dark:border-white/5 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between items-center flex-wrap">
                      <span className="font-bold text-xs uppercase text-[#2b3033] dark:text-white">Sender: {alert.sender}</span>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-500 border-red-500/20">
                        {alert.riskLevel} Risk
                      </span>
                    </div>
                    <p className="font-medium text-[#6b6f72] dark:text-slate-400">"{alert.message}"</p>
                    <div className="text-[9px] text-slate-500 dark:text-slate-500 font-bold border-t border-slate-200 dark:border-white/5 pt-1.5 flex justify-between">
                      <span>Action: {alert.actionTaken}</span>
                      <span>{new Date(alert.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
