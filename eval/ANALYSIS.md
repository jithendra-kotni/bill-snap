# Evaluation and failure analysis

## How I tested

- 20 images: 15 bills (printed, handwritten, faded, blurry, cropped, digital) and 5 non-bills.
- Answer key (`truth.csv`): drafted from the images with help from an AI assistant, then checked by me.I checked every row against the paper bills or the original images.” Or, if you didn’t check them all: “I checked the rows for the bills I photographed myself; the rest I checked against the downloaded image.
- `scripts/eval.mjs` sends each image to the deployed app's API and scores merchant, date, total and category. It resizes with `sharp`, not the browser, so results can differ slightly from the phone.
- Scoring is automatic: a merchant is right if one name contains the other; date and total must match exactly; a category can have several accepted values. A blank answer in the key means the value is not visible in the image, so returning nothing is the correct behaviour.
- Models: the app tries `gemini-3.5-flash` first and falls back to `gemini-3.1-flash-lite` when the first is busy or rate-limited. The final run used both.

## Runs, and mistakes in my answer key

I ran the evaluation four times. The first two runs used an answer key in which the rows for files 12 to 15 were shifted by one file, because the AI assistant that helped me draft it could not display `12.avif` and skipped it. I noticed because the app's "wrong" answers for `13.jpeg`, `14.webp` and `15.webp` were exactly the right answers for the neighbouring bills. I corrected those rows (run 3), then filled in the row for `12.avif` (run 4, the final run, scored below). The earlier runs are kept in `eval/previous-runs` for transparency: run 1 (first key, mixed models), run 2 (same key, all answers from the lighter model) and run 3 (corrected key, empty row for `12.avif`).

One more mistake: in run 4 the merchant cell for `12.avif` still held a placeholder word ("Merchant") that I typed by mistake, so the app's answer (D-Mart) was scored wrong. I corrected the key after the run and did not re-run. With the corrected key the automatic merchant score would be 14/15, and the figures below are the run 4 output as it was.

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

These are the automatic scores from `results.md`, which also has the per-image table. After checking each wrong cell by hand I classed them as:If it says 18/08/2025: “The app is right; my key said 2025-08-16 because I misread a low-resolution preview, so this is a mistake in my key.” If it says 16/08/2025: “The bill says 16/08/2025 and the app read 18, a real error: 6 and 8 look alike on this blurry annotated photo.
## Where it fails, and why

**1. A cropped receipt made the model do arithmetic (real error).** On `6.jpg` the screenshot ends before the grand total, yet the app returned 161.16, which is exactly the sum of the five visible items. I told the model to read and never calculate, and it did not obey. In the runs I looked at, no "unsure" flag fired on it. On `1.webp` and `5.jpg`, which are missing information in a similar way, the model correctly returned nothing, so this is inconsistent behaviour and not a rule it always follows.

**2. Some "wrong" answers are defensible readings.** On `4.jpeg` the bill shows only a due date (18 May 2026), and the app used it as the date while my key leaves the date blank. On `8.jpg` the invoice says "Sold by Retailez Private Limited" under an Amazon logo, and the app chose the seller while my key says Amazon. I count these as ambiguity, but the automatic score counts them wrong.

**3. A date I read differently from the app.** On `11.jpg` the app read 2025-08-18. FILL (look at the original image and write which is right, and if the app was right, say my key was wrong).

**4. `12.avif`.** 12.avif is a D-Mart receipt. The app’s answers matched what I read, and the only mismatch was my placeholder in the key. The GSTIN warning came from [the app misreading one character / the number really being wrong]

**5. The uncertainty flags are a weak guide.** Across 60 field answers (15 bills with 4 fields each), 7 were wrong. The app flagged 1 of those 7 and gave no warning for the other 6, including the wrong merchants, the wrong totals and the wrong category. It flagged 9 of the 53 correct fields. Not all of those are false alarms: when a value is genuinely not visible (for example the merchant on `4.jpeg`, or the total on `5.jpg`), flagging is the right behaviour. The rest are mostly the "date is over two years old" rule firing on correct dates on old bills such as `9.png`, `10.png`, `13.jpeg` and `15.webp`. This split is my reading of the table, not something I counted cell by cell.

**6. The bill check raises false alarms from my own rules, and misses one thing it was meant to catch.**
- `3.jpeg`: the item prices already include tax, so they do not match the printed pre-tax subtotal, and it warned about the subtotal.
- `7.jpg`: the receipt prints a line "IGST amount Rs.0" next to CGST and SGST, and my rule "IGST mixed with CGST/SGST" fired on it.
- `13.jpeg`: the item totals include a 5 percent tax, so "quantity times rate" does not match the printed line totals, which caused several line warnings. The circled "S.Tax" line on that bill (a possible double tax next to CGST and SGST) did not get its own warning in the runs I checked, which is the kind of case the check was meant to catch.
- `5.jpg` and `6.jpg`: my line check ignores per-item discounts. Some `5.jpg` warnings may be real, because some weighed-fruit lines do not multiply out on the receipt itself.
- `9.png`: the total warning looks justified, because that invoice contradicts itself (printed subtotal 745.00 while the items add up to 1,745.00).

**7. Speed.** The average time per bill was about 17 seconds in run 1, 20 in run 2, 7 in run 3 and 10 in run 4, on the same images with the same code. So much of the delay depends on how busy the AI service is: the main model often answers "busy" or "rate limited", and the function then retries with waits and falls back to the lighter model. The longer prompt (line items and charges) also makes each answer longer. The slowest single image in the final run took 17 seconds.

## Limits of this test

- Only 20 images, so I report counts, not percentages.
- Not every image is my own photo:Images 2, 3 and 4 are photos I took of real bills; images 9, 10, 12 and 13 are downloaded specimens or templates; images 16 to 20 are my non-bill photos.” Use your real list, because I can’t tell which are yours.
- The 5 non-bills were easy, so 5/5 says little about hard cases such as a menu that looks like a bill.
- The answer key came from reading images, some of them blurry, and errors in it already cost me runs, so a few values could still be wrong.
- The test ran on a free AI tier that is often busy, so timing varies from run to run, and the model is not fully repeatable.

## What I would change next

- Ask the model to return nothing when a value is not printed, and check that a returned total really appears on the bill.
- Make the bill check understand tax-inclusive prices, per-item discounts and zero-amount tax lines, and catch repeated taxes such as "S.Tax" next to GST.
- Stop flagging correct old dates, or make that rule depend on the bill type.
- Put the model that actually answers first, to cut the time wasted on retries.
- Use the phone's locale for date order and show the bill's own currency.
- Test on many more of my own photos, and add a small on-device bill-or-not check.

## Do I like what I built?
A starting point: “I like that the AI only reads the bill and plain code checks the numbers, because that is easy to test and explain. I am not happy that the uncertainty flags miss most mistakes and that two cropped receipts got totals the model calculated itself. With more time I would fix the false alarms in the bill check and test on many more of my own bills.” Change it to what you really think, because they will ask about it.