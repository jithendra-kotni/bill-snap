# Bill Snap evaluation

API: https://billsnap-six.vercel.app | models: gemini-3.5-flash, gemini-3.1-flash-lite | average 7103 ms | 20 images, 0 failed to run

Bill detection: bills recognised 15/15, bills missed 0; non-bills rejected 5/5, non-bills wrongly accepted 0

| Field | Correct | Wrong | Check by hand | Wrong and flagged | Wrong and NOT flagged | Correct but flagged |
|---|---|---|---|---|---|---|
| merchant | 13/15 | 2 | 0 | 0 | 2 | 2 |
| date | 12/15 | 3 | 0 | 2 | 1 | 5 |
| total | 12/15 | 3 | 0 | 1 | 2 | 1 |
| category | 15/15 | 0 | 0 | 0 | 0 | 0 |

| Image | Kind | Bill? | Merchant | Date | Total | Category | Flagged by app | Audit warnings | ms |
|---|---|---|---|---|---|---|---|---|---|
| 1.webp | faded scan cropped | bill → bill ✓ | ✓ | ✓ | ✗ got 2212.1 | ✓ | merchant, date |  | 5699 |
| 2.webp | clean photo | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  |  | 6208 |
| 3.jpeg | angled creased | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  | subtotal | 4199 |
| 4.jpeg | blurry long strip | bill → bill ✓ | ✓ | ✗ got 2026-05-25 | ✓ | ✓ | merchant, date |  | 3960 |
| 5.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✗ got 399.46 | ✓ | total | line-math line-math line-math total-math | 6784 |
| 6.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | total | line-math | 4299 |
| 7.jpg | digital | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  |  | 4279 |
| 8.jpg | digital invoice | bill → bill ✓ | ✗ got RETAILEZ PRIVATE LIMITED | ✓ | ✓ | ✓ |  |  | 13207 |
| 9.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date | subtotal total-math | 3285 |
| 10.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date |  | 4084 |
| 11.jpg | annotated photo | bill → bill ✓ | ✓ | ✗ got 2025-08-18 | ✓ | ✓ |  | subtotal total-math | 6888 |
| 12.avif | photo | bill → bill ✓ | ✗ got DMART AMBERPET | ✗ got 2023-02-18 | ✗ got 1986.48 | ✓ | date | subtotal total-math gstin | 12765 |
| 13.jpeg | old scan | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date | line-math line-math line-math line-math line-math subtotal masked | 5075 |
| 14.webp | handwritten | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  |  | 10204 |
| 15.webp | handwritten | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date |  | 5139 |
| 16.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 3388 |
| 17.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 3788 |
| 18.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 28466 |
| 19.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 5847 |
| 20.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 4493 |