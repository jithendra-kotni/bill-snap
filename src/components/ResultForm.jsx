import { useState } from 'react';
import { CATEGORIES } from '../lib/validate';

function Field({ warn, flag, label, children }) {
  return (
    <label className={'field' + (warn ? ' warn' : '')}>
      <span>{label}</span>
      {children}
      {warn && <small>⚠ {flag}. Please check.</small>}
    </label>
  );
}

export default function ResultForm({ result, flags = {}, onSave, onCancel }) {
  const [v, setV] = useState({
    merchant: result?.merchant?.value ?? '',
    date: result?.date?.value ?? '',
    total: result?.total?.value ?? '',
    category: CATEGORIES.includes(result?.category) ? result?.category : 'Other',
  });
  const [touched, setTouched] = useState({});

  const change = (k, val) => {
    setV((prev) => ({ ...prev, [k]: val }));
    setTouched((prev) => ({ ...prev, [k]: true }));
  };
  const isWarn = (k) => Boolean(flags?.[k] && !touched[k]);
  const canSave = v.merchant.trim() && Number(v.total) > 0;

  return (
    <div className="card">
      <h2>Check the details</h2>
      <Field warn={isWarn('merchant')} flag={flags?.merchant} label="Merchant">
        <input
          value={v.merchant}
          onChange={(e) => change('merchant', e.target.value)}
          placeholder="e.g. Supermarket"
          aria-label="Merchant"
        />
      </Field>
      <Field warn={isWarn('date')} flag={flags?.date} label="Date">
        <input
          type="date"
          value={v.date}
          onChange={(e) => change('date', e.target.value)}
          aria-label="Date"
        />
      </Field>
      <Field warn={isWarn('total')} flag={flags?.total} label="Total (₹)">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          value={v.total}
          onChange={(e) => change('total', e.target.value)}
          placeholder="0.00"
          aria-label="Total"
        />
      </Field>
      <Field warn={isWarn('category')} flag={flags?.category} label="Category">
        <select
          value={v.category}
          onChange={(e) => change('category', e.target.value)}
          aria-label="Category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>
      <div className="row">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => onSave({ ...v, total: Number(v.total) })}
        >
          Save bill
        </button>
      </div>
    </div>
  );
}
