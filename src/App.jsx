import { useEffect, useRef, useState } from 'react';
import { resizeToJpeg } from './lib/image';
import { checkResult } from './lib/validate';
import { auditBill, hasAuditData } from './lib/audit';
import { loadBills, saveBills } from './lib/storage';
import ResultForm from './components/ResultForm';
import BillList from './components/BillList';
import AccuracyPanel from './components/AccuracyPanel';
import { AuditPanel, AuditAlert } from './components/AuditPanel';
import './App.css';

const blank = () => ({
  is_bill: true,
  merchant: { value: null, confidence: 0 },
  date: { value: null, confidence: 0 },
  total: { value: null, confidence: 0 },
  category: 'Other',
  category_confidence: 0,
  line_items: [],
  charges: [],
});
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export default function App() {
  const [tab, setTab] = useState('scan');
  const [bills, setBills] = useState([]);
  const [stage, setStage] = useState('idle'); // idle | loading | review | notbill | error
  const [draft, setDraft] = useState(null);
  const [editingBill, setEditingBill] = useState(null);
  const [message, setMessage] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const camRef = useRef();
  const galRef = useRef();

  useEffect(() => { loadBills().then(setBills); }, []);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStage('loading');
    try {
      const { dataUrl, thumb } = await resizeToJpeg(file);
      const r = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl.split(',')[1], mimeType: 'image/jpeg' }),
      });
      const result = await r.json();
      if (!r.ok) {
        console.warn('API detail:', result.detail);
        throw new Error(result.error || 'Request failed');
      }
      const findings = result.is_bill ? auditBill(result) : [];
      setDraft({ result, thumb, flags: checkResult(result), findings });
      setAlertOpen(findings.some((f) => f.severity === 'warn'));
      setStage(result.is_bill ? 'review' : 'notbill');
    } catch (err) {
      setMessage(err.message);
      setStage('error');
    }
  }

  function manualEntry() {
    const result = blank();
    setDraft({ result, thumb: draft?.thumb || null, flags: checkResult(result), findings: [] });
    setAlertOpen(false);
    setStage('review');
  }

  async function handleSave(values) {
    const raw = draft.result;
    // Record which fields the user had to correct (useful for the evaluation table)
    const corrected = [];
    if (values.merchant !== (raw.merchant?.value ?? '')) corrected.push('merchant');
    if (values.date !== (raw.date?.value ?? '')) corrected.push('date');
    if (values.total !== Number(raw.total?.value)) corrected.push('total');
    if (values.category !== raw.category) corrected.push('category');

    const audit = (draft.findings || []).map(({ severity, code, title }) => ({ severity, code, title }));
    const bill = { id: uid(), ...values, thumb: draft.thumb, raw, corrected, audit, createdAt: Date.now() };
    const next = [bill, ...bills];
    setBills(next);
    await saveBills(next);
    reset();
    setTab('list');
  }

  async function handleSaveEdit(values) {
    if (!editingBill) return;
    const raw = editingBill.raw;
    let corrected = editingBill.corrected || [];
    if (raw) {
      corrected = [];
      if (values.merchant !== (raw.merchant?.value ?? '')) corrected.push('merchant');
      if (values.date !== (raw.date?.value ?? '')) corrected.push('date');
      if (values.total !== Number(raw.total?.value)) corrected.push('total');
      if (values.category !== raw.category) corrected.push('category');
    }

    const next = bills.map((b) =>
      b.id === editingBill.id
        ? {
            ...b,
            ...values,
            id: editingBill.id,
            createdAt: editingBill.createdAt,
            corrected,
          }
        : b
    );
    setBills(next);
    await saveBills(next);
    setEditingBill(null);
  }

  async function handleDelete(id) {
    const next = bills.filter((b) => b.id !== id);
    setBills(next);
    await saveBills(next);
  }

  function reset() { setDraft(null); setStage('idle'); setMessage(''); setAlertOpen(false); }

  const warnCount = draft?.findings?.filter((f) => f.severity === 'warn').length || 0;

  return (
    <div className="app">
      <header><h1>Bill Snap</h1></header>
      <main>
        {tab === 'list' && (
          editingBill ? (
            <>
              {editingBill.thumb && <img className="preview" src={editingBill.thumb} alt="Your bill" />}
              <ResultForm
                result={{
                  merchant: { value: editingBill.merchant },
                  date: { value: editingBill.date },
                  total: { value: editingBill.total },
                  category: editingBill.category,
                }}
                flags={{}}
                onSave={handleSaveEdit}
                onCancel={() => setEditingBill(null)}
              />
            </>
          ) : (
            <BillList bills={bills} onDelete={handleDelete} onEdit={setEditingBill} />
          )
        )}

        {tab === 'accuracy' && <AccuracyPanel bills={bills} />}

        {tab === 'scan' && stage === 'idle' && (
          <div className="card center">
            <p>Take a photo of a bill, or pick one from your gallery.</p>
            <button onClick={() => camRef.current.click()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Take photo
            </button>
            <button className="secondary" onClick={() => galRef.current.click()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Choose from gallery
            </button>
          </div>
        )}

        {tab === 'scan' && stage === 'loading' && (
          <div className="card center">
            <div className="spinner" />
            <p>Reading your bill…</p>
            <small>Usually 5 to 15 seconds</small>
          </div>
        )}

        {tab === 'scan' && stage === 'notbill' && (
          <div className="card center">
            <p>Hmm, this doesn't look like a bill.</p>
            <small>{draft?.result?.reason}</small>
            <button onClick={reset}>Try another photo</button>
            <button className="secondary" onClick={manualEntry}>It is a bill, enter manually</button>
          </div>
        )}

        {tab === 'scan' && stage === 'error' && (
          <div className="card center">
            <p>Sorry, something went wrong reading that.</p>
            <small>{message}</small>
            <button onClick={reset}>Try again</button>
            <button className="secondary" onClick={manualEntry}>Enter manually</button>
          </div>
        )}

        {tab === 'scan' && stage === 'review' && (
          <>
            {draft.thumb && <img className="preview" src={draft.thumb} alt="Your bill" />}
            <AuditPanel findings={draft.findings} show={hasAuditData(draft.result)} />
            <ResultForm result={draft.result} flags={draft.flags} onSave={handleSave} onCancel={reset} />
            {alertOpen && <AuditAlert count={warnCount} onClose={() => setAlertOpen(false)} />}
          </>
        )}

        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
        <input ref={galRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </main>
      <nav>
        <button
          className={tab === 'scan' ? 'on' : ''}
          onClick={() => { setEditingBill(null); setTab('scan'); }}
        >
          Scan
        </button>
        <button
          className={tab === 'list' ? 'on' : ''}
          onClick={() => { setEditingBill(null); setTab('list'); }}
        >
          Bills ({bills.length})
        </button>
        <button
          className={tab === 'accuracy' ? 'on' : ''}
          onClick={() => { setEditingBill(null); setTab('accuracy'); }}
        >
          Accuracy
        </button>
      </nav>
    </div>
  );
}
