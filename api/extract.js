const CATEGORIES = ['Food', 'Groceries', 'Utilities', 'Transport', 'Shopping', 'Health', 'Education', 'Other'];

const PROMPT = `You analyse photos for a bill-scanning app.

Step 1: decide whether the image is a bill: a receipt, invoice or utility/phone/internet/fee bill (printed or handwritten).
These are NOT bills: selfies, ID cards, screenshots of chats or apps, menus, price lists, landscapes, random documents.

Step 2: if it is a bill, extract:
- merchant: the shop/company/institution name
- date: the bill date as YYYY-MM-DD. Dates on these bills are usually DD/MM/YYYY (Indian format). If the day/month order is truly ambiguous, still pick DD/MM and give a low confidence.
- total: the FINAL amount payable as a number (not the subtotal, tax or change given). No currency symbol.
- currency: e.g. "INR", or null
- category: one of ${CATEGORIES.join(', ')}

Rules:
- Never guess. If a field is unreadable or missing, use null and confidence 0.
- Confidence is a number from 0 to 1 for how sure you are the value is exactly right.
- If it is not a bill, set is_bill to false and every field value to null.

Reply with ONLY this JSON, nothing else:
{
 "is_bill": true,
 "bill_confidence": 0.0,
 "reason": "one short sentence",
 "merchant": {"value": null, "confidence": 0.0},
 "date": {"value": null, "confidence": 0.0},
 "total": {"value": null, "confidence": 0.0},
 "currency": null,
 "category": "Other",
 "category_confidence": 0.0
}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(model, image, mimeType, lowThinking) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const generationConfig = { responseMimeType: 'application/json', temperature: 0 };
  if (lowThinking) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: image } }] }],
      generationConfig,
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const t0 = Date.now();
  try {
    const { image, mimeType = 'image/jpeg' } = req.body || {};
    if (!image) return res.status(400).json({ error: 'No image sent' });
    if (image.length > 3_500_000) return res.status(413).json({ error: 'Image too large' });

    // Primary model first, then backups (comma-separated list)
    const models = [
      process.env.GEMINI_MODEL || 'gemini-3.5-flash',
      ...(process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite,gemini-3-flash-preview')
        .split(',')
        .map((s) => s.trim()),
    ].filter(Boolean);

    let r, lastDetail = '', usedModel = '';
    let lowThinking = true;

    outer: for (const model of models) {
      usedModel = model;
      for (let attempt = 0; attempt < 3; attempt++) {
        r = await callGemini(model, image, mimeType, lowThinking);
        if (r.ok) break outer;
        lastDetail = (await r.text()).slice(0, 300);

        // If Google rejects the thinking setting, retry once without it
        if (r.status === 400 && lowThinking && /think/i.test(lastDetail)) {
          lowThinking = false;
          r = await callGemini(model, image, mimeType, false);
          if (r.ok) break outer;
          lastDetail = (await r.text()).slice(0, 300);
        }

        // Retry only on temporary errors (overloaded / rate limited)
        if (r.status !== 503 && r.status !== 429) break outer;
        await sleep(1000 * 2 ** attempt); // wait 1s, 2s, 4s
      }
    }

    if (!r.ok) {
      const busy = r.status === 503 || r.status === 429;
      console.log('failed after', Date.now() - t0, 'ms, status', r.status);
      return res.status(502).json({
        error: busy ? 'The AI service is busy right now. Please try again in a moment.' : 'The AI service returned an error',
        detail: lastDetail,
      });
    }

    const data = await r.json();
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    json._model = usedModel;
    json._ms = Date.now() - t0;
    console.log('ok:', usedModel, json._ms, 'ms');
    return res.status(200).json(json);
  } catch (e) {
    console.log('error after', Date.now() - t0, 'ms:', e.message);
    return res.status(500).json({ error: 'Could not read the AI response' });
  }
}