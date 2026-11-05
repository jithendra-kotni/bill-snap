export const CATEGORIES = ['Food', 'Groceries', 'Utilities', 'Transport', 'Shopping', 'Health','Education', 'Other'];
const LOW = 0.7;

// Returns { merchant, date, total, category } where each is a reason string or null.
export function checkResult(r) {
  const flags = { merchant: null, date: null, total: null, category: null };

  const m = r.merchant || {};
  if (!m.value || String(m.value).trim().length < 2) flags.merchant = 'Could not read the merchant';
  else if ((m.confidence ?? 0) < LOW) flags.merchant = 'Low confidence';

  const d = r.date || {};
  if (!d.value) flags.date = 'Could not read the date';
  else {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(d.value);
    const t = ok ? new Date(d.value + 'T00:00:00') : null;
    const now = new Date();
    const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(now.getFullYear() - 2);
    if (!t || isNaN(t)) flags.date = 'Date looks invalid';
    else if (t > now) flags.date = 'Date is in the future';
    else if (t < twoYearsAgo) flags.date = 'Date is over 2 years old';
    else if ((d.confidence ?? 0) < LOW) flags.date = 'Low confidence (check day/month order)';
  }

  const t = r.total || {};
  const n = Number(t.value);
  if (t.value == null || !isFinite(n) || n <= 0) flags.total = 'Could not read a valid total';
  else if ((t.confidence ?? 0) < LOW) flags.total = 'Low confidence (is this the final total?)';

  if (!CATEGORIES.includes(r.category) || (r.category_confidence ?? 0) < LOW) flags.category = 'Category is a guess';

  return flags;
}