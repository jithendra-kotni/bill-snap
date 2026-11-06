# Bill Snap

A phone web app (PWA) that reads a photo of a bill, checks it, and saves it on the phone.

Live app: https://billsnap-six.vercel.app
Evaluation on 20 images: [eval/ANALYSIS.md](eval/ANALYSIS.md) and [eval/results.md](eval/results.md)

## What it does

1. Take a photo of a bill or pick one from the gallery.
2. Decides whether the image is a bill. If not (a selfie, an ID card, a screenshot), it says so politely and offers manual entry.
3. If it is a bill, it reads the merchant, date and total and suggests a category.
4. Fields it is unsure about are marked, and the user can correct everything before saving.
5. A "Bill check" looks at the numbers: do the lines add up, is a charge listed twice under different names, is a fee worded like a tax, do CGST and SGST match, is the GSTIN valid.
6. Bills are saved on the phone. The list has search, a month filter, edit, delete, CSV export and a monthly spending summary. An Accuracy tab shows how often the user had to correct each field.

## How it works

Photo, shrunk in the browser (1024px) and sent to a small serverless function (`api/extract.js`), which asks a Google Gemini vision model to read the bill and answer with structured JSON.

The key design decision: **the AI only reads, and plain code does the checking.**

- `src/lib/validate.js` marks a field as unsure when the model's confidence is low or the value looks wrong (missing, date in the future, and so on).
- `src/lib/audit.js` checks the numbers the model read (arithmetic, repeated or renamed charges, GST structure, GSTIN check digit). These rules are ordinary code, so they can be tested without photos (`node scripts/audit-test.mjs`) and are easy to explain.
- Findings are worded as "worth checking", never as accusations, because a misread photo can cause a false alarm.

If the AI service is busy, the function retries with backoff and then tries backup models. If everything fails, the user can still enter the bill by hand.

## Tech and why

| Choice | Why |
|---|---|
| PWA (React + Vite) | Fast to test on a real phone, installs to the home screen, no native build |
| Vision LLM (Gemini) | Handles messy photos with one call, no training data needed |
| Serverless function on Vercel | Keeps the API key off the phone |
| IndexedDB (`idb-keyval`) | Saves bills on the phone, larger than localStorage |
| Plain-code checks | Predictable, testable, explainable |

## Run locally

```
npm install
vercel dev
```

Use `vercel dev` (not `npm run dev`) so the `/api` function runs too. The app needs these environment variables, set in the Vercel project (never committed):

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, default `gemini-3.5-flash`)
- `GEMINI_FALLBACK_MODEL` (optional, comma-separated backups)

Other scripts:

- `node scripts/audit-test.mjs` tests the bill-check rules with made-up numbers.
- `node scripts/eval.mjs` runs the images in `eval/images` through the app and scores them against `eval/truth.csv`. The images are not in the repo because they contain personal details.

## Known limitations

- Depends on an external AI service. It can be slow or busy: in my four runs the average was between about 7 and 20 seconds per bill depending on load.
- The "unsure" flags miss many wrong values (see the evaluation).
- The bill check has false alarms: it does not understand tax-inclusive prices, per-item discounts or zero-amount tax lines.
- Dates are assumed to be DD/MM, so US-style dates can be swapped.
- Amounts are shown in rupees even if the bill is in another currency.
- Bills are stored only in the phone's browser. Clearing site data deletes them, and there is no sync.
- Bill photos are sent to a third-party AI service for reading.
- The "valid GSTIN" check only checks the number's structure. It cannot tell whether the seller is registered.
- The main AI model was often busy during my test, so the lighter backup model answered many of the bills.