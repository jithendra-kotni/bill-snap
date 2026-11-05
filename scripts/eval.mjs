// Evaluation harness: sends each image in eval/images to the app's API and scores it against eval/truth.csv
import fs from 'node:fs';
import path from 'node:path';
import { checkResult } from '../src/lib/validate.js';
import { auditBill } from '../src/lib/audit.js';

const BASE = (process.argv[2] || 'https://billsnap-six.vercel.app').replace(/[./]+$/, '');
const DIR = 'eval/images';
const FIELDS = ['merchant', 'date', 'total', 'category'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const blank = (s) => s === undefined || s === null || String(s).trim() === '';
const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const esc = (s) => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');
const q = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

// Scoring rules: true = correct, false = wrong, null = needs a human look
function cmpMerchant(p, t) {
  if (blank(t)) return blank(p);
  if (blank(p)) return false;
  const a = norm(p), b = norm(t);
  if (!a || !b) return null; // non-Latin names: check by hand
  return a.includes(b) || b.includes(a);
}
function cmpDate(p, t) {
  if (blank(t)) return blank(p);
  return String(p || '') === t.trim();
}
function cmpTotal(p, t) {
  if (blank(t)) return p === null || p === undefined;
  if (p === null || p === undefined) return false;
  return Number.isFinite(Number(p)) && Math.abs(Number(p) - Number(t)) < 0.01;
}
function cmpCat(p, t) {
  if (blank(t)) return true;
  return t.split('|').map((s) => s.trim().toLowerCase()).includes(String(p || '').toLowerCase());
}

let sharp = null;
try { sharp = (await import('sharp')).default; }
catch { console.log('NOTE: sharp is not installed, so original images are sent (the app resizes to 1024px first).'); }

async function prepare(file) {
  if (sharp) {
    const buf = await sharp(file).rotate()
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 }).toBuffer();
    return { buf, mime: 'image/jpeg' };
  }
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { buf: fs.readFileSync(file), mime };
}

async function extract(buf, mime) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: buf.toString('base64'), mimeType: mime }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data, ms: Date.now() - t0 };
}

const csvRows = parseCsv(fs.readFileSync('eval/truth.csv', 'utf8').replace(/^\uFEFF/, ''));
const head = csvRows.shift().map((h) => h.trim().toLowerCase());
const truth = csvRows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])));

console.log(`Evaluating ${truth.length} images against ${BASE}\n`);
const results = [];

for (const t of truth) {
  const file = path.join(DIR, t.file);
  if (!fs.existsSync(file)) { console.log('MISSING:', t.file); continue; }
  const truthBill = /^(y|yes|true|1)$/i.test(t.is_bill);
  const row = { file: t.file, kind: t.kind || '', truthBill };
  try {
    const { buf, mime } = await prepare(file);
    const res = await extract(buf, mime);
    row.ms = res.ms;
    if (!res.ok) {
      row.error = res.data.error || 'request failed';
    } else {
      const d = res.data;
      row.model = d._model || '';
      row.predBill = d.is_bill === true;
      row.pred = {
        merchant: d.merchant?.value ?? null,
        date: d.date?.value ?? null,
        total: d.total?.value ?? null,
        category: d.category ?? null,
      };
      if (truthBill) {
        row.ok = {
          merchant: cmpMerchant(row.pred.merchant, t.merchant),
          date: cmpDate(row.pred.date, t.date),
          total: cmpTotal(row.pred.total, t.total),
          category: cmpCat(row.pred.category, t.category),
        };
        const fl = checkResult(d);
        row.flag = Object.fromEntries(FIELDS.map((f) => [f, Boolean(fl[f])]));
        row.warnings = auditBill(d).filter((x) => x.severity === 'warn').map((x) => x.code).join(' ');
      }
    }
  } catch (e) {
    row.error = e.message;
  }
  results.push(row);
  console.log(t.file.padEnd(14), row.error ? 'ERROR: ' + row.error : `${row.predBill ? 'bill' : 'not bill'} (${row.ms} ms)`);
  await sleep(1500); // stay under rate limits
}

const done = results.filter((r) => !r.error);
const bills = done.filter((r) => r.truthBill);
const nonBills = done.filter((r) => !r.truthBill);
const TP = bills.filter((r) => r.predBill).length;
const TN = nonBills.filter((r) => !r.predBill).length;
const avgMs = Math.round(done.reduce((a, r) => a + r.ms, 0) / Math.max(1, done.length));
const models = [...new Set(done.map((r) => r.model).filter(Boolean))].join(', ');

const lines = [];
lines.push('# Bill Snap evaluation', '');
lines.push(`API: ${BASE} | models: ${models || 'n/a'} | average ${avgMs} ms | ${results.length} images, ${results.length - done.length} failed to run`, '');
lines.push(`Bill detection: bills recognised ${TP}/${bills.length}, bills missed ${bills.length - TP}; non-bills rejected ${TN}/${nonBills.length}, non-bills wrongly accepted ${nonBills.length - TN}`, '');
lines.push('| Field | Correct | Wrong | Check by hand | Wrong and flagged | Wrong and NOT flagged | Correct but flagged |');
lines.push('|---|---|---|---|---|---|---|');
for (const f of FIELDS) {
  const right = bills.filter((r) => r.ok[f] === true).length;
  const wrong = bills.filter((r) => r.ok[f] === false);
  const review = bills.filter((r) => r.ok[f] === null).length;
  const caught = wrong.filter((r) => r.flag[f]).length;
  const falseAlarm = bills.filter((r) => r.ok[f] === true && r.flag[f]).length;
  lines.push(`| ${f} | ${right}/${bills.length} | ${wrong.length} | ${review} | ${caught} | ${wrong.length - caught} | ${falseAlarm} |`);
}
lines.push('', '| Image | Kind | Bill? | Merchant | Date | Total | Category | Flagged by app | Audit warnings | ms |');
lines.push('|---|---|---|---|---|---|---|---|---|---|');
const mark = (r, f) => (r.ok[f] === true ? '✓' : r.ok[f] === null ? '? check' : `✗ got ${esc(r.pred[f] ?? 'nothing')}`);
for (const r of results) {
  if (r.error) { lines.push(`| ${r.file} | ${esc(r.kind)} | ERROR: ${esc(r.error)} | | | | | | | |`); continue; }
  const billCell = `${r.truthBill ? 'bill' : 'not bill'} → ${r.predBill ? 'bill' : 'not bill'} ${r.truthBill === r.predBill ? '✓' : '✗'}`;
  if (!r.truthBill) { lines.push(`| ${r.file} | ${esc(r.kind)} | ${billCell} | – | – | – | – | | | ${r.ms} |`); continue; }
  const flagged = FIELDS.filter((f) => r.flag[f]).join(', ');
  lines.push(`| ${r.file} | ${esc(r.kind)} | ${billCell} | ${mark(r, 'merchant')} | ${mark(r, 'date')} | ${mark(r, 'total')} | ${mark(r, 'category')} | ${flagged} | ${r.warnings} | ${r.ms} |`);
}
fs.writeFileSync('eval/results.md', lines.join('\n'));

const csv = ['file,kind,truth_bill,pred_bill,merchant,date,total,category,merchant_ok,date_ok,total_ok,category_ok,flagged,warnings,model,ms,error'];
for (const r of results) {
  csv.push([
    r.file, r.kind, r.truthBill, r.predBill,
    r.pred?.merchant, r.pred?.date, r.pred?.total, r.pred?.category,
    r.ok?.merchant, r.ok?.date, r.ok?.total, r.ok?.category,
    r.flag ? FIELDS.filter((f) => r.flag[f]).join(' ') : '', r.warnings, r.model, r.ms, r.error,
  ].map(q).join(','));
}
fs.writeFileSync('eval/results.csv', csv.join('\n'));

console.log('\n' + lines.slice(0, 12).join('\n'));
console.log('\nWrote eval/results.md and eval/results.csv');