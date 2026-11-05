import { useState } from 'react';
import { CATEGORIES } from '../lib/validate';

export default function ResultForm({ result, flags, onSave, onCancel }) {
  const [v, setV] = useState({
    merchant: result.merchant?.value ?? '',
    date: result.date?.value ?? '',
    total: result.total?.value ?? '',
    category: CATEGORIES.includes(result.category) ? result.category : 'Other',
  });
  const [touched, setTouched] = useState({});

  const change = (k, val) => {
    setV({ ...v, [k]: val });
    setTouched({ ...touched, [k]: true });
  };
  const warn = (k) => flags[k] && !touched[k];
  const canSave = v.merchant.trim() && Number(v.total) > 0;

  const Field = ({ k, label, children }) => (
    <label className={'field' + (warn(k) ? ' warn' : '')}>
      <span>{label}</span>
      {children}
      {warn(k) && <small>⚠ {flags[k]}. Please check.</small>}
    </label>
  );

  return (
    <div className="card">
      <h2>Check the details</h2>
      <Field k="merchant" label="Merchant">
        <input value={v.merchant} onChange={(e) => change('merchant', e.target.value)} />
      </Field>
      <Field k="date" label="Date">
        <input type="date" value={v.date} onChange={(e) => change('date', e.target.value)} />
      </Field>
      <Field k="total" label="Total (₹)">
        <input type="number" inputMode="decimal" step="0.01" value={v.total}
          onChange={(e) => change('total', e.target.value)} />
      </Field>
      <Field k="category" label="Category">
        <select value={v.category} onChange={(e) => change('category', e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div className="row">
        <button className="secondary" onClick={onCancel}>Cancel</button>
        <button disabled={!canSave} onClick={() => onSave({ ...v, total: Number(v.total) })}>Save bill</button>
      </div>
    </div>
  );
}