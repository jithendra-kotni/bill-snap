# Bill Snap evaluation

API: https://billsnap-six.vercel.app | models: gemini-3.1-flash-lite, gemini-3.5-flash | average 17213 ms | 20 images, 0 failed to run

Bill detection: bills recognised 15/15, bills missed 0; non-bills rejected 5/5, non-bills wrongly accepted 0

| Field | Correct | Wrong | Check by hand | Wrong and flagged | Wrong and NOT flagged | Correct but flagged |
|---|---|---|---|---|---|---|
| merchant | 10/15 | 5 | 0 | 0 | 5 | 2 |
| date | 10/15 | 5 | 0 | 3 | 2 | 4 |
| total | 10/15 | 5 | 0 | 0 | 5 | 2 |
| category | 13/15 | 2 | 0 | 0 | 2 | 0 |

| Image | Kind | Bill? | Merchant | Date | Total | Category | Flagged by app | Audit warnings | ms |
|---|---|---|---|---|---|---|---|---|---|
| 1.webp | faded scan cropped | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | merchant, date, total |  | 13210 |
| 2.webp | clean photo | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  |  | 12201 |
| 3.jpeg | angled creased | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  | subtotal | 6437 |
| 4.jpeg | blurry long strip | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | merchant, date |  | 25102 |
| 5.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | total | line-math line-math line-math | 12526 |
| 6.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✗ got 161.16 | ✓ |  | line-math | 17913 |
| 7.jpg | digital | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  | subtotal igst-mix | 37180 |
| 8.jpg | digital invoice | bill → bill ✓ | ✗ got RETAILEZ PRIVATE LIMITED | ✓ | ✓ | ✓ |  |  | 27483 |
| 9.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date | subtotal total-math | 32872 |
| 10.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date |  | 19565 |
| 11.jpg | annotated photo | bill → bill ✓ | ✓ | ✗ got 2025-08-18 | ✓ | ✓ |  | subtotal | 14163 |
| 12.avif | old scan | bill → bill ✓ | ✗ got D-Mart | ✗ got 2023-02-18 | ✗ got 1986.48 | ✗ got Groceries | date | subtotal gstin | 19644 |
| 13.jpeg | handwritten | bill → bill ✓ | ✗ got Liquor Street | ✗ got 2018-05-20 | ✗ got 1139 | ✗ got Food | date | line-math line-math line-math line-math line-math subtotal | 19919 |
| 14.webp | handwritten | bill → bill ✓ | ✗ got HILLSIDE JOINERY LTD | ✗ got 2026-03-14 | ✗ got 406.8 | ✓ |  |  | 6023 |
| 15.webp |  | bill → bill ✓ | ✗ got SAMSUDDIN SIDDIQUI | ✗ got 2024-10-28 | ✗ got 7226 | ✓ | date |  | 13184 |
| 16.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 10932 |
| 17.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 16872 |
| 18.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 11125 |
| 19.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 12691 |
| 20.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 15209 |