# Nine individual 3D conversions — evidence

**Successful corrected candidate:** `09385bd8105e235f90493390fccbbe133083bd72` passed [CI 41929244609](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41929244609) with **269 JavaScript, 52 API and 69/69 browser checks**: 18 accessibility,15 contract/fallback and36 rendered/gameplay. Zero failed, skipped or flaky browser results. [Successful receipt](verification-09385bd.json) · [Exact 188-file clean build](build-09385bd.json). Public delivery is being verified in [PROJECT_STATUS.md](../../../PROJECT_STATUS.md).

The corrected advanced 320px captures were inspected: [Binary Flash](binary-flash-mobile-320-09385bd.png) and [Circuit Rush](circuit-rush-mobile-320-09385bd.png). The unchanged assertions passed at both 390px and 320px.

## Preserved earlier measured frames

Exact frame source: `10e3b16af8c314379e540da65b8aa7da0f536775`, [CI 41926291553](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41926291553). This historical candidate was not released: 67/69 browser checks passed, with two advanced mobile-layout failures. All nine real 4K/control-completion scenarios passed. The final09385bd candidate corrected those layouts and reran all scenarios successfully.

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
