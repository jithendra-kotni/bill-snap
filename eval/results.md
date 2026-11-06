# Bill Snap evaluation

API: https://billsnap-six.vercel.app | models: gemini-3.5-flash, gemini-3.1-flash-lite | average 10092 ms | 20 images, 0 failed to run

Bill detection: bills recognised 15/15, bills missed 0; non-bills rejected 5/5, non-bills wrongly accepted 0

| Field | Correct | Wrong | Check by hand | Wrong and flagged | Wrong and NOT flagged | Correct but flagged |
|---|---|---|---|---|---|---|
| merchant | 13/15 | 2 | 0 | 0 | 2 | 2 |
| date | 13/15 | 2 | 0 | 1 | 1 | 6 |
| total | 13/15 | 2 | 0 | 0 | 2 | 1 |
| category | 14/15 | 1 | 0 | 0 | 1 | 0 |

| Image | Kind | Bill? | Merchant | Date | Total | Category | Flagged by app | Audit warnings | ms |
|---|---|---|---|---|---|---|---|---|---|
| 1.webp | faded scan cropped | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | merchant, date, total |  | 6907 |
| 2.webp | clean photo | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  |  | 6474 |
| 3.jpeg | angled creased | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  | subtotal | 9748 |
| 4.jpeg | blurry long strip | bill → bill ✓ | ✓ | ✗ got 2026-05-18 | ✓ | ✓ | merchant, date |  | 4629 |
| 5.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✗ got 399.46 | ✓ |  | line-math line-math line-math total-math | 3715 |
| 6.jpg | digital cropped | bill → bill ✓ | ✓ | ✓ | ✗ got 161.16 | ✓ |  | line-math | 9955 |
| 7.jpg | digital | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  | subtotal igst-mix | 12437 |
| 8.jpg | digital invoice | bill → bill ✓ | ✗ got RETAILEZ PRIVATE LIMITED | ✓ | ✓ | ✓ |  |  | 10155 |
| 9.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date | subtotal total-math | 9819 |
| 10.png | digital template | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date |  | 9555 |
| 11.jpg | annotated photo | bill → bill ✓ | ✓ | ✗ got 2025-08-18 | ✓ | ✓ |  | subtotal | 11723 |
| 12.avif | photo | bill → bill ✓ | ✗ got D-Mart | ✓ | ✓ | ✓ | date | subtotal gstin | 12193 |
| 13.jpeg | old scan | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ | date | line-math line-math line-math line-math line-math subtotal | 10631 |
| 14.webp | handwritten | bill → bill ✓ | ✓ | ✓ | ✓ | ✓ |  |  | 12292 |
| 15.webp | handwritten | bill → bill ✓ | ✓ | ✓ | ✓ | ✗ got Shopping | date |  | 10206 |
| 16.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 11888 |
| 17.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 12906 |
| 18.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 10134 |
| 19.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 17318 |
| 20.jpeg | non-bill | not bill → not bill ✓ | – | – | – | – | | | 9164 |