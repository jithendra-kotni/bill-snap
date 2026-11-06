# Bill Snap evaluation

API: https://billsnap-six.vercel.app | models: gemini-3.1-flash-lite | average 19938 ms | 20 images, 0 failed to run

Bill detection: bills recognised 15/15, bills missed 0; non-bills rejected 5/5, non-bills wrongly accepted 0

| Field | Correct | Wrong | Check by hand | Wrong and flagged | Wrong and NOT flagged | Correct but flagged |
|---|---|---|---|---|---|---|
| merchant | 10/15 | 5 | 0 | 0 | 5 | 2 |
| date | 9/15 | 6 | 0 | 3 | 3 | 3 |
| total | 10/15 | 5 | 0 | 0 | 5 | 2 |
| category | 13/15 | 2 | 0 | 0 | 2 | 0 |

| Image | Kind | Bill? | Merchant | Date | Total | Category | Flagged by app | Audit warnings | ms |
|---|---|---|---|---|---|---|---|---|---|
| 1.webp | faded scan cropped | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | merchant, date, total |  | 22578 |
| 2.webp | clean photo | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  |  | 81100 |
| 3.jpeg | angled creased | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  | subtotal | 21568 |
| 4.jpeg | blurry long strip | bill → bill ✓ | ✓ | ✗ got 2026-05-18 | ✓ | ✓ | merchant |  | 15247 |
| 5.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | total | line-math line-math line-math | 37459 |
| 6.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✗ got 161.16 | ✓ |  | line-math | 13476 |
| 7.jpg | digital | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  | subtotal igst-mix | 10136 |
| 8.jpg | digital invoice | bill → bill ✓ | ✗ got RETAILEZ PRIVATE LIMITED | ✓ | ✓ | ✓ |  |  | 10151 |
| 9.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date | subtotal total-math | 14564 |
| 10.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date |  | 11367 |
| 11.jpg | annotated photo | bill → bill ✓ | ✓ | ✗ got 2025-08-18 | ✓ | ✓ |  | subtotal | 10857 |
| 12.avif | old scan | bill → bill ✓ | ✗ got D-Mart | ✗ got 2023-02-18 | ✗ got 1986.48 | ✗ got Groceries | date | subtotal gstin | 21417 |
| 13.jpeg | handwritten | bill → bill ✓ | ✗ got Liquor Street | ✗ got 2018-05-20 | ✗ got 1139 | ✗ got Food | date | line-math line-math line-math line-math line-math subtotal | 12436 |
| 14.webp | handwritten | bill → bill ✓ | ✗ got HILLSIDE JOINERY LTD | ✗ got 2026-03-14 | ✗ got 406.8 | ✓ |  |  | 14862 |
| 15.webp |  | bill → bill ✓ | ✗ got SAMSUDDIN SIDDIQUI | ✗ got 2024-10-28 | ✗ got 7226 | ✓ | date |  | 27531 |
| 16.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 14696 |
| 17.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 18302 |
| 18.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 13916 |
| 19.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 11451 |
| 20.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 15647 |