// Rule-based checks on the numbers the model READ from the bill.
// The model reads; this code decides. Every finding is "worth checking", never an accusation.

const TAX_KINDS = ['cgst', 'sgst', 'igst', 'gst', 'cess'];
const FEE_KINDS = ['packaging', 'delivery', 'platform_fee', 'convenience_fee'];
const SERVICE_WORDS = /\b(serv\w*|sc|s\.?\s?chg|staff\w*|captain|hospitality|gratuity|tips?|waiter\w*)\b/i;
const TAX_WORDS = /\b(tax|gst|cgst|sgst|igst|cess|levy|govt|government|duty|vat)\b/i;
const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const NAMES = {
  service_charge: 'Service charge',
  tip: 'Tip',
  packaging: 'Packaging charge',
  delivery: 'Delivery charge',
  platform_fee: 'Platform fee',
  convenience_fee: 'Convenience fee',
  cgst: 'CGST',
  sgst: 'SGST',
  igst: 'IGST',
  gst: 'GST',
  cess: 'Cess',
  other: 'Other charge',
};

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const rs = (n) => '₹' + (Math.round(n * 100) / 100).toLocaleString('en-IN');
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const tol = (n) => Math.max(1.5, 0.005 * Math.abs(n)); // allowed rounding gap

// Returns 'ok' | 'format' | 'state' | 'checksum'. Checks structure only, not registration.
export function gstinCheck(raw) {
  const g = String(raw || '').toUpperCase().replace(/\s+/g, '');
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return 'format';
  const st = Number(g.slice(0, 2));
  if (!((st >= 1 && st <= 38) || st === 97 || st === 99)) return 'state';
  let total = 0;
  for (let i = 0; i < 14; i++) {
    const p = GSTIN_CHARS.indexOf(g[i]) * (i % 2 === 0 ? 1 : 2);
    total += Math.floor(p / 36) + (p % 36);
  }
  const check = GSTIN_CHARS[(36 - (total % 36)) % 36];
  return check === g[14] ? 'ok' : 'checksum';
}

function kindOf(c) {
  const t = String(c.type || 'other').toLowerCase();
  // A charge the model called "other" but worded like a service charge counts as one
  if (t === 'other' && SERVICE_WORDS.test(c.label || '')) return 'service_charge';
  return NAMES[t] ? t : 'other';
}

export function hasAuditData(r) {
  return (r.line_items?.length || 0) + (r.charges?.length || 0) > 0 || Boolean(r.gstin?.value);
}

export function auditBill(r) {
  const out = [];
  const add = (severity, code, title, detail) => out.push({ severity, code, title, detail });

  const items = (Array.isArray(r.line_items) ? r.line_items : [])
    .map((i) => ({ name: String(i.description || '').trim(), qty: num(i.quantity), unit: num(i.unit_price), amount: num(i.amount) }))
    .filter((i) => i.amount !== null);

  const charges = (Array.isArray(r.charges) ? r.charges : [])
    .map((c) => ({ label: String(c.label || '').trim(), amount: num(c.amount), rate: num(c.rate_percent), kind: kindOf(c) }))
    .filter((c) => c.amount !== null);

  const itemSum = sum(items.map((i) => i.amount));
  const subtotal = num(r.subtotal);
  const base = subtotal ?? (items.length ? itemSum : null);
  const discount = Math.abs(num(r.discount) ?? 0);
  const roundOff = num(r.round_off) ?? 0;
  const total = num(r.total?.value);

  const taxSum = sum(charges.filter((c) => TAX_KINDS.includes(c.kind)).map((c) => c.amount));
  const feeSum = sum(charges.filter((c) => !TAX_KINDS.includes(c.kind)).map((c) => c.amount));
  const serviceLike = charges.filter((c) => c.kind === 'service_charge' || c.kind === 'tip');

  // 1. Each line should multiply out
  for (const i of items) {
    if (i.qty !== null && i.unit !== null) {
      const calc = i.qty * i.unit;
      if (Math.abs(calc - i.amount) > Math.max(1, 0.01 * i.amount)) {
        add('warn', 'line-math', 'A line doesn’t multiply out',
          `${i.name || 'An item'}: ${i.qty} × ${rs(i.unit)} = ${rs(calc)}, but the bill shows ${rs(i.amount)}.`);
      }
    }
  }

  // 2. Same line listed more than once (information only: it may be a real repeat order)
  const seen = {};
  for (const i of items) {
    const k = i.name.toLowerCase() + '|' + i.amount;
    seen[k] = seen[k] || { i, n: 0 };
    seen[k].n++;
  }
  for (const { i, n } of Object.values(seen)) {
    if (n > 1 && i.name) {
      add('info', 'dup-item', 'Same line listed more than once',
        `“${i.name}” (${rs(i.amount)}) appears ${n} times. Check you ordered it ${n} times.`);
    }
  }

  // 3. Items vs the printed subtotal
  if (subtotal !== null && items.length && Math.abs(itemSum - subtotal) > tol(subtotal)) {
    add('warn', 'subtotal', 'Items don’t match the subtotal',
      `The items add up to ${rs(itemSum)}, but the bill’s subtotal says ${rs(subtotal)}.`);
  }

  // 4. Grand total (also recognises tax-inclusive prices so they don't cause false alarms)
  let inclusive = false;
  if (total !== null && base !== null) {
    const exclusiveExpected = base + taxSum + feeSum - discount + roundOff;
    const inclusiveExpected = base + feeSum - discount + roundOff;
    if (Math.abs(total - exclusiveExpected) <= tol(total)) {
      // adds up with tax on top: fine
    } else if (taxSum > 0 && Math.abs(total - inclusiveExpected) <= tol(total)) {
      inclusive = true;
      add('info', 'inclusive', 'Prices seem to include tax',
        'The total matches the item prices, so the tax shown looks like it is already inside them.');
    } else {
      const diff = total - exclusiveExpected;
      const parts = `${rs(base)} items + ${rs(taxSum + feeSum)} taxes and fees` +
        (discount ? ` − ${rs(discount)} discount` : '') +
        (roundOff ? ` ${roundOff > 0 ? '+' : '−'} ${rs(Math.abs(roundOff))} round-off` : '');
      add('warn', 'total-math',
        diff > 0 ? `Total is ${rs(diff)} higher than the lines add up to` : `Total is ${rs(-diff)} lower than the lines add up to`,
        `${parts} = ${rs(exclusiveExpected)}, but the total is ${rs(total)}. Either the bill has an unexplained amount or a number was misread, so compare with the photo.`);
    }
  }

  // 5. Service charge / tip, including the same charge under different names
  if (serviceLike.length >= 2) {
    add('warn', 'dup-service', 'Service-type charge appears more than once',
      `${serviceLike.map((c) => `“${c.label || 'unnamed'}” ${rs(c.amount)}`).join(' and ')} look like the same kind of charge under different names (together ${rs(sum(serviceLike.map((c) => c.amount)))}). You can ask the restaurant to explain or remove the extra one.`);
  } else if (serviceLike.length === 1) {
    const c = serviceLike[0];
    const pct = base ? Math.round((c.amount / base) * 1000) / 10 : null;
    add('info', 'service', `${NAMES[c.kind]} added`,
      `“${c.label || 'unnamed'}” ${rs(c.amount)}${pct ? ` (${pct}% of the items)` : ''}. These are usually optional, so you can ask for it to be removed.`);
  }

  // 6. A fee that is worded like a tax
  for (const c of charges) {
    if (TAX_WORDS.test(c.label) && ['service_charge', 'tip', 'platform_fee', 'convenience_fee'].includes(c.kind)) {
      add('warn', 'masked', 'A fee is worded like a tax',
        `“${c.label}” (${rs(c.amount)}) sounds like a government tax, but it looks like a ${NAMES[c.kind].toLowerCase()}. Government taxes are normally GST, CGST, SGST or cess. Ask what it is.`);
    }
  }

  // 7. Repeated fees and taxes
  const byKind = {};
  for (const c of charges) (byKind[c.kind] = byKind[c.kind] || []).push(c);
  const has = (k) => (byKind[k] || []).length > 0;
  for (const [kind, list] of Object.entries(byKind)) {
    if (list.length < 2) continue;
    if (FEE_KINDS.includes(kind)) {
      add('warn', 'dup-fee', `${NAMES[kind]} charged more than once`,
        `${list.map((c) => `“${c.label || 'unnamed'}” ${rs(c.amount)}`).join(' and ')}. Check whether both are meant to be there.`);
    }
    if (['cgst', 'sgst', 'igst', 'gst'].includes(kind)) {
      const rates = list.map((c) => c.rate);
      const differentRates = rates.every((x) => x !== null) && new Set(rates).size > 1;
      if (!differentRates) {
        add('warn', 'dup-tax', `${NAMES[kind]} appears more than once`,
          `${list.map((c) => rs(c.amount)).join(' and ')}. Tax may be counted twice, for example by a delivery app on top of the restaurant.`);
      }
    }
  }
  if (has('gst') && (has('cgst') || has('sgst'))) {
    add('warn', 'double-gst', 'GST shown both combined and split',
      'The bill lists a combined GST line and also CGST/SGST lines. That could mean the tax is counted twice.');
  }
  if (has('igst') && (has('cgst') || has('sgst'))) {
    add('warn', 'igst-mix', 'IGST mixed with CGST/SGST',
      'A single sale normally carries either IGST or CGST plus SGST, not both.');
  }
  if ((byKind.cgst || []).length === 1 && (byKind.sgst || []).length === 1) {
    const a = byKind.cgst[0].amount;
    const b = byKind.sgst[0].amount;
    if (Math.abs(a - b) > 1.01) {
      add('warn', 'cgst-sgst', 'CGST and SGST don’t match',
        `CGST is ${rs(a)} and SGST is ${rs(b)}. For a local sale they are normally equal.`);
    }
  }

  // 8. Tax amount against its printed rate (skipped when prices include tax)
  if (!inclusive && base !== null) {
    const svc = sum(serviceLike.map((c) => c.amount));
    const fees = sum(charges.filter((c) => FEE_KINDS.includes(c.kind) || c.kind === 'other').map((c) => c.amount));
    const bases = [base, base - discount, base + svc, base - discount + svc, base + fees, base - discount + fees, base + svc + fees, base - discount + svc + fees];
    for (const c of charges) {
      if (!['cgst', 'sgst', 'igst', 'gst'].includes(c.kind) || c.rate === null) continue;
      const ok = bases.some((b) => Math.abs((b * c.rate) / 100 - c.amount) <= Math.max(1.5, 0.02 * c.amount));
      if (!ok) {
        add('warn', 'tax-math', `${NAMES[c.kind]} doesn’t match its rate`,
          `${c.rate}% of ${rs(base)} is about ${rs((base * c.rate) / 100)}, but the bill charges ${rs(c.amount)}.`);
      }
    }
  }

  // 9. Extra fees summary
  const extras = charges.filter((c) => FEE_KINDS.includes(c.kind));
  if (extras.length) {
    const pct = base ? Math.round((sum(extras.map((c) => c.amount)) / base) * 100) : null;
    add('info', 'fees', 'Extra fees on this bill',
      `${extras.map((c) => `${NAMES[c.kind]} ${rs(c.amount)}`).join(', ')}${pct ? ` (${pct}% of the items)` : ''}.`);
  }

  // 10. GSTIN and composition scheme
  const hasGst = charges.some((c) => TAX_KINDS.includes(c.kind) && c.kind !== 'cess');
  const gstin = String(r.gstin?.value || '').trim();
  if (gstin) {
    const res = gstinCheck(gstin);
    if (res !== 'ok') {
      const why = { format: 'is not in the 15-character GSTIN format', state: 'starts with an invalid state code', checksum: 'fails the GSTIN check digit, which usually means a typo or a made-up number' }[res];
      const misread = (num(r.gstin?.confidence) ?? 1) < 0.7 ? ' This could also be a misread of the photo.' : '';
      add('warn', 'gstin', 'GSTIN doesn’t look valid',
        `“${gstin}” ${why}.${misread} This only checks the number’s structure. Only the official GST portal can confirm a GSTIN is registered.`);
    }
  } else if (hasGst) {
    add('info', 'no-gstin', 'GST charged but no GSTIN found',
      'A seller that collects GST should print its GSTIN. It may simply be outside the photo.');
  }
  if (r.composition_scheme_mentioned === true && hasGst) {
    add('warn', 'composition', 'Composition scheme and GST on the same bill',
      'The bill mentions the composition scheme, but it also charges GST. Composition sellers are not supposed to collect GST from customers.');
  }

  return out.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'warn' ? -1 : 1));
}