# Evaluation and failure analysis

## How I tested

- 20 images: 15 bills (printed, handwritten, faded, blurry, cropped, digital) and 5 non-bills.
- Answer key (`truth.csv`): drafted from the images with help from an AI assistant and corrected by me when the runs exposed mistakes (see below). I did not re-check every value against the paper bills, so a few could still be wrong.
- `scripts/eval.mjs` sends each image to the deployed app's API and scores merchant, date, total and category. It resizes with `sharp`, not the browser, so results can differ slightly from the phone.
- Scoring is automatic: a merchant is right if one name contains the other; date and total must match exactly; a category can have several accepted values. A blank answer in the key means the value is not visible in the image, so returning nothing is the correct behaviour.
- Models: the app tries `gemini-3.5-flash` first and falls back to `gemini-3.1-flash-lite` when the first is busy or rate-limited. In the final run 16 of the 20 images were answered by the fallback and 4 by the main model.

## Runs, and mistakes in my answer key

I ran the evaluation four times. The first two runs used an answer key in which the rows for files 12 to 15 were shifted by one file, because the AI assistant that helped me draft it could not display `12.avif` and skipped it. I noticed because the app's "wrong" answers for `13.jpeg`, `14.webp` and `15.webp` were exactly the right answers for the neighbouring bills. I corrected those rows (run 3), then filled in the row for `12.avif` (run 4, the final run, scored below). The earlier runs are kept in `eval/previous-runs` for transparency: run 1 (first key, 12 of 15 bills answered by the fallback model), run 2 (same key, all answers from the fallback) and run 3 (corrected key, empty row for `12.avif`).

One more mistake: in run 4 the merchant cell for `12.avif` still held a placeholder word ("Merchant") that I typed by mistake, so the app's answer (D-Mart) was scored wrong. I corrected the key after the run and did not re-run. With the corrected key the automatic merchant score would be 14/15, and the figures below are the run 4 output as it was.

An earlier version of this file also contained pasted draft text and one wrong statement about `5.jpg`. This version replaces it.

## Results (final run, run 4)

| | Result |
|---|---|
| Bills recognised as bills | 15 / 15 |
| Non-bills rejected | 5 / 5 |
| Merchant correct | 13 / 15 (14 / 15 with the corrected key) |
| Date correct | 13 / 15 |
| Total correct | 13 / 15 |
| Category correct | 14 / 15 |
| Average time per bill | about 10 seconds |

These are the automatic scores from `results.md`, which also has the per-image table. After checking each wrong cell by hand, the 7 wrong cells are: 2 real errors (the totals on `5.jpg` and `6.jpg`), 3 defensible readings or judgement calls (the date on `4.jpeg`, the merchant on `8.jpg`, the category on `15.webp`), 1 mistake in my key (the merchant on `12.avif`) and 1 I have not settled (the date on `11.jpg`).

## Where it fails, and why

**1. Cropped receipts made the model do arithmetic (real errors).** On `5.jpg` and `6.jpg` the screenshot ends before the grand total, yet the app returned 399.46 and 161.16. Each is exactly the sum of the items visible on that screenshot. I told the model to read and never calculate, and it did not obey, and no "unsure" flag fired on either. The behaviour is not consistent: in runs 1 and 2 `5.jpg` returned nothing and was flagged, and `1.webp`, which is missing information in a similar way, returned nothing in the runs I checked.

**2. Some "wrong" answers are defensible readings.** On `4.jpeg` the bill shows only a due date (18 May 2026), and the app used it as the date while my key leaves the date blank. On `8.jpg` the invoice says "Sold by Retailez Private Limited" under an Amazon logo, and the app chose the seller while my key says Amazon. On `15.webp`, a handwritten invoice for fittings and labour, the app chose Shopping and my key says Other, which is a judgement call. The automatic score counts all three as wrong.

**3. A date I read differently from the app.** On `11.jpg` the app read 2025-08-18 and my key says 2025-08-16. I have not settled which is right from the original image, so I count this cell as unresolved.

**4. `12.avif`.** This is a D-Mart receipt. Its row in the answer key was empty in runs 1 to 3, and in run 4 it held a placeholder, so the merchant was scored wrong by mistake. The bill check warned about the GSTIN and the subtotal on this receipt, and I did not check whether the GSTIN warning was a misread or a real problem.

**5. The uncertainty flags are a weak guide.** Across 60 field answers (15 bills with 4 fields each), 7 were wrong. The app flagged 1 of those 7 (the date on `4.jpeg`) and gave no warning for the other 6, including both wrong totals and both wrong merchants. It flagged 9 of the 53 correct fields. 4 of those were right to flag, because the value was not visible (`1.webp` merchant, date and total, and `4.jpeg` merchant). The other 5 are the "date is over two years old" rule firing on correct dates on old bills (`9.png`, `10.png`, `12.avif`, `13.jpeg`, `15.webp`), which are false alarms.

**6. The bill check raises false alarms from my own rules, and misses one thing it was meant to catch.**
- `3.jpeg`: the item prices already include tax, so they do not match the printed pre-tax subtotal, and it warned about the subtotal.
- `7.jpg`: the receipt prints a line "IGST amount Rs.0" next to CGST and SGST, and my rule "IGST mixed with CGST/SGST" fired on it.
- `13.jpeg`: the item totals include a 5 percent tax, so "quantity times rate" does not match the printed line totals, which caused several line warnings. The circled "S.Tax" line on that bill (a possible double tax next to CGST and SGST) did not get its own warning, which is the kind of case the check was meant to catch.
- `5.jpg` and `6.jpg`: my line check ignores per-item discounts. Some `5.jpg` warnings may be real, because some weighed-fruit lines do not multiply out on the receipt itself.
- `9.png`: the total warning looks justified, because that invoice contradicts itself (printed subtotal 745.00 while the items add up to 1,745.00).

**7. Speed.** The average time per bill was about 17 seconds in run 1, 20 in run 2, 7 in run 3 and 10 in run 4, on the same images with the same code. Much of the delay depends on how busy the AI service is: the main model often answers "busy" or "rate limited", and the function then retries with waits and falls back to the lighter model. The longer prompt (line items and charges) also makes each answer longer. The slowest single image in the final run took 17 seconds.

## Limits of this test

- Only 20 images, so I report counts, not percentages.
- Not every image is my own photo: some are downloaded specimens or templates (for example the two hospital invoices, `9.png` and `10.png`).
- The 5 non-bills were easy, so 5/5 says little about hard cases such as a menu that looks like a bill.
- The answer key came from reading images, some of them blurry, and errors in it already cost me runs, so a few values could still be wrong.
- The test ran on a free AI tier that is often busy, so timing varies from run to run, and the model is not fully repeatable.

## What I would change next

- Ask the model to return nothing when a value is not printed, and check that a returned total really appears on the bill as a printed number, not as a sum of items.
- Make the bill check understand tax-inclusive prices, per-item discounts and zero-amount tax lines, and catch repeated taxes such as "S.Tax" next to GST.
- Stop flagging correct old dates, or make that rule depend on the bill type.
- Put the model that actually answers first, to cut the time wasted on retries.
- Use the phone's locale for date order and show the bill's own currency.
- Test on many more of my own photos, and add a small on-device bill-or-not check.

## Do I like what I built?

I like that the AI only reads the bill and plain code checks the numbers, because that is easy to test and explain. I am not happy that the uncertainty flags miss most mistakes and that two cropped receipts got totals the model calculated itself. With more time I would fix the false alarms in the bill check and test on many more of my own bills.