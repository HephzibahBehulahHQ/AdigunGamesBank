# Nine individual 3D conversions — evidence

## Published milestone

Exact source **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** passed [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881): **269 JavaScript, 52 API and 69/69 browser checks** (18 accessibility,15 contract/fallback,36 rendered/gameplay), with zero unexpected, skipped or flaky browser results. [Final successful gate](verification-5547a53.json) · [Clean 188-file build](build-5547a53.json).

[Pages run 41936442011](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41936442011) succeeded at **2026-11-04T23:47:55Z**. **115/115 public files matched the source exactly** at **23:51:27Z**. [Publication receipt](publication-5547a53.json) · [Full public-file hashes](deployment-5547a53.json). The live site is **<https://adigungamesbank.hephzibahbehulah.com/>**. Actual public Binary Flash controls completed both frames in 9 operations with 0 rejections; reload opened Mission 2.

The earlier 09385bd gate also passed all 390 checks, but its publishing attempt timed out. [Preserved gate](verification-09385bd.json) · [Failed publication](publication-09385bd.json) · [Failed public comparison](deployment-09385bd.json). The later successful deployment used the same host/configuration; no causal configuration fix is claimed.

Corrected advanced 320px captures were inspected and remain unchanged: [Binary Flash](binary-flash-mobile-320-09385bd.png) and [Circuit Rush](circuit-rush-mobile-320-09385bd.png). Their page-width and sampled 44px target assertions passed at 390px and 320px again on the published candidate.

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

## Uploaded Pages package inspection

At **2026-11-04T23:29:03Z**, the exact failed-run Pages ZIP passed CRC and archive checks. Its one tar contains 386 regular files and 60 directories, no symbolic/hard links or unsafe paths, and 11,386,541 bytes of file contents. **All 386 files are byte-for-byte identical to 09385bd**; only the GitHub workflow file is intentionally absent. Root index and all nine game entry/runtime files are present. [Complete artifact report](pages-artifact-09385bd.json). This identifies no packaging defect and does not expose GitHub’s internal publishing state.
