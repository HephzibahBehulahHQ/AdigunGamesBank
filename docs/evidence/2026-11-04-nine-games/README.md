# Nine individual 3D conversions — evidence

Exact measured source: `10e3b16af8c314379e540da65b8aa7da0f536775`. [CI run](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). **Not released:** 67/69 browser checks passed; two advanced mobile-layout failures are being corrected. All nine new real 4K/control-completion scenarios passed.

[Structured receipt](verification-10e3b16.json) · [188-file build fingerprint](build-10e3b16.json). Captures below are the original PNG bytes from the CI artifact, inspected by the integration owner. Screenshot CSS pixel dimensions differ from the measured renderer drawing buffer; the receipt preserves both.

| Game | Captured original scene | Measured buffer |
|---|---|---|
| game1 | [Original frame](neon-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game2 | [Original frame](circuit-rush-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game4 | [Original frame](volt-dodge-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game5 | [Original frame](resistor-match-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game6 | [Original frame](capacitor-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game7 | [Original frame](binary-flash-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game8 | [Original frame](fusebox-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game10 | [Original frame](apex-4k-10e3b16.png) | 3840 × 2160; GL error 0 |
| game17 | [Original frame](penalty-4k-10e3b16.png) | 3840 × 2160; GL error 0 |

The initial failures at 8a9ff73 and 748fb20 are retained in their separate JSON receipts. Software rendering establishes actual raster size and visible 3D, not hardware frame rate, complete accessibility, native-console certification or full production completion.
