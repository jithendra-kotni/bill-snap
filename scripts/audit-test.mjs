import { auditBill, gstinCheck } from '../src/lib/audit.js';

const show = (name, r) => {
  console.log('\n' + name);
  auditBill(r).forEach((f) => console.log('  ' + f.severity + ': ' + f.title));
};

console.log('GSTIN valid sample:', gstinCheck('27AAPFU0939F1ZV'), '| altered last char:', gstinCheck('27AAPFU0939F1ZX'));

// 1. Clean bill: expect no findings
show('Clean bill', {
  total: { value: 693 }, gstin: { value: '27AAPFU0939F1ZV', confidence: 0.9 },
  line_items: [
    { description: 'Paneer Tikka', quantity: 2, unit_price: 250, amount: 500 },
    { description: 'Naan', quantity: 4, unit_price: 40, amount: 160 },
  ],
  subtotal: 660,
  charges: [
    { label: 'CGST 2.5%', amount: 16.5, rate_percent: 2.5, type: 'cgst' },
    { label: 'SGST 2.5%', amount: 16.5, rate_percent: 2.5, type: 'sgst' },
  ],
});

// 2. Trouble: expect duplicate service charge, CGST/SGST mismatch, bad GSTIN, total too high
show('Problem bill', {
  total: { value: 520 }, gstin: { value: '27AAPFU0939F1ZX', confidence: 0.9 },
  line_items: [
    { description: 'Biryani', quantity: 1, unit_price: 300, amount: 300 },
    { description: 'Cold drink', quantity: 2, unit_price: 60, amount: 120 },
  ],
  subtotal: 420,
  charges: [
    { label: 'Service Charge 10%', amount: 42, rate_percent: 10, type: 'service_charge' },
    { label: 'S.Chg', amount: 21, rate_percent: null, type: 'other' },
    { label: 'CGST 2.5%', amount: 10.5, rate_percent: 2.5, type: 'cgst' },
    { label: 'SGST 2.5%', amount: 13, rate_percent: 2.5, type: 'sgst' },
  ],
});

// 3. Tax-inclusive prices: expect an info note only (and no GSTIN note)
show('Tax inclusive', {
  total: { value: 100 }, gstin: { value: null },
  line_items: [
    { description: 'Tea', quantity: 2, unit_price: 20, amount: 40 },
    { description: 'Samosa', quantity: 2, unit_price: 30, amount: 60 },
  ],
  charges: [
    { label: 'CGST', amount: 2.38, rate_percent: 2.5, type: 'cgst' },
    { label: 'SGST', amount: 2.38, rate_percent: 2.5, type: 'sgst' },
  ],
});