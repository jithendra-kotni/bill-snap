import { useEffect, useRef, useState } from 'react';
import { resizeToJpeg } from './lib/image';
import { checkResult } from './lib/validate';
import { loadBills, saveBills } from './lib/storage';
import ResultForm from './components/ResultForm';
import BillList from './components/BillList';
import './App.css';

const blank = () => ({
  is_bill: true,
  merchant: { value: null, confidence: 0 },
  date: { value: null, confidence: 0 },
  total: { value: null, confidence: 0 },
  category: 'Other',
  category_confidence: 0,
});
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export default function App() {
  const [tab, setTab] = useState('scan');
  const [bills, setBills] = useState([]);
  const [stage, setStage] = useState('idle'); // idle | loading | review | notbill | error
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState('');
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
      setDraft({ result, thumb, flags: checkResult(result) });
      setStage(result.is_bill ? 'review' : 'notbill');
    } catch (err) {
      setMessage(err.message);
      setStage('error');
    }
  }

  function manualEntry() {
    const result = blank();
    setDraft({ result, thumb: draft?.thumb || null, flags: checkResult(result) });
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

    const bill = { id: uid(), ...values, thumb: draft.thumb, raw, corrected, createdAt: Date.now() };
    const next = [bill, ...bills];
    setBills(next);
    await saveBills(next);
    reset();
    setTab('list');
  }

  async function handleDelete(id) {
    const next = bills.filter((b) => b.id !== id);
    setBills(next);
    await saveBills(next);
  }

  function reset() { setDraft(null); setStage('idle'); setMessage(''); }

  return (
    <div className="app">
      <header><h1>Bill Snap</h1></header>
      <main>
        {tab === 'list' && <BillList bills={bills} onDelete={handleDelete} />}

        {tab === 'scan' && stage === 'idle' && (
          <div className="card center">
            <p>Take a photo of a bill, or pick one from your gallery.</p>
            <button onClick={() => camRef.current.click()}>📷 Take photo</button>
            <button className="secondary" onClick={() => galRef.current.click()}>🖼 Choose from gallery</button>
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
            <ResultForm result={draft.result} flags={draft.flags} onSave={handleSave} onCancel={reset} />
          </>
        )}

        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFile} />
        <input ref={galRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </main>
      <nav>
        <button className={tab === 'scan' ? 'on' : ''} onClick={() => setTab('scan')}>Scan</button>
        <button className={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>Bills ({bills.length})</button>
      </nav>
    </div>
  );
}