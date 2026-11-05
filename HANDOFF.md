Bill Snap: handoff

Internship task: PWA that photographs a bill, checks it is a bill, extracts merchant/date/total, suggests a category, flags uncertain fields and suspicious charges, lets the user correct fields, saves bills on the phone. The owner must be able to explain every line on a call, so keep code simple and explain changes.

Stack: React + Vite PWA, IndexedDB via idb-keyval, Vercel serverless function api/extract.js calling the Gemini API. Secrets live in Vercel env vars and are used by vercel dev. Never print or commit keys. Run with vercel dev, not npm run dev.

File ownership. Do NOT edit without asking: api/extract.js, src/lib/audit.js, src/lib/validate.js, src/lib/image.js, src/components/AuditPanel.jsx, src/components/AuditPanel.css.
Allowed: src/App.css, src/components/BillList.jsx, src/components/ResultForm.jsx.
Rules: no new libraries, one task at a time, keep existing props and class names working, show a diff before applying.

Design: neutral and calm. Background #F7F8FA, white cards with 1px border #E4E7EC and 12px radius, text #101828, muted text #667085, one accent #0F766E for the primary button and active tab only. Warnings are subtle: border #FEDF89, text #B54708, no filled backgrounds. System font stack. Mobile first, tap targets at least 44px.
