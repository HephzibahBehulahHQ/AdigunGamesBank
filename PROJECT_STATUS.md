# Adigun Game Bank — current project status

Updated **2026-11-05T00:58:25+01:00 (Europe/Berlin)**. This is the current acceptance record.

## Goal Line conversion

The skip link and its destination are explicitly focusable. The 320 px
reduced-motion accessibility check now passes in the pinned WebKit 26.0
and system Chrome. WebKit also passed actual 3840 × 2160 WebGL rendering
and the keyboard-only graphics fallback on the preceding build. The
existing WebKit cache was protocol-incompatible. The pinned browser and
its Windows helper were installed in ignored `test-results` without
changing the repository lockfile. Safari hardware performance was not tested.

Reducing turf diffuse anisotropy from 4× to 2× lowered median 16K scene
GPU time from 29.2 to 27.9 ms in two five-clearance broadcast runs on
Intel Arc 140T. Median observed GPU completion interval fell from 43.5
to 41.3 ms. The paired downsampled captures retained visible grass detail.
Both runs completed without WebGL errors or context loss, and the targeted
Chrome checks for actual 4K, camera switching and heavy turf passed.

Successful clearances now schedule a distinct receiver touch cue at the
projected arrival point. Starting another ball or restarting cancels
pending audio from the previous feed. Chrome verified a non-silent cue
with the expected travel delay after the kick. The targeted audio,
interception, loft and final-tier drill checks passed.

Each incoming feed now opens with a short cue for its actual conditions.
Chrome verified the bounce cue, the heavy-turf cue and the change to a
moving-receiver cue on the next ball. All 21 Goal Line browser checks
passed, including actual 4K, keyboard play and saved campaign completion.

Two five-clearance Chrome runs on Intel Arc 140T compared the 16K RGBA8
color target with a smaller RGB565 target. The RGB565 run reduced median
scene-plus-presentation GPU time from 38.4 to 35.3 ms and the median
observed completion interval from 46.4 to 43.3 ms. Both restored 4K
without WebGL errors. RGB565 produced visible bands in the sky and color
shifts in shaded areas, so the renderer keeps RGBA8. The rebuilt site
matched the baseline SHA256 after removing the experiment.

The player rigs reuse vectors, quaternions and leg-solver output during
each boot placement. All 12 engine checks and 21 Chrome browser checks
passed, including the 10,000-drill solver, the pose reset regression and
actual 4K. The allocation change was verified in code. Its impact on frame
time has not been measured separately.

Disconnecting a controller that has sent input now pauses an active feed
and clears its movement. Chrome's simulated controller test confirmed that
ball and defender positions stay fixed after disconnect, that a held Menu
button on reconnection leaves play paused, and that a fresh Menu press
resumes it. The timed keyboard pause test also passed. Physical controller
disconnect and reconnection were not tested.

Player shin and boot rotations now reset on all axes when the rig returns
to its base pose. A Chrome regression test reproduced retained rotation on
the previous build and verified that the fixed receiver returns both joints
to their original orientation after a reach. All 21 Goal Line Chrome
checks passed on the fixed build, including actual 4K and context recovery.

The receiving and pressing players now use a fixed support-foot target
from the start of the reach as their other boot moves toward the ball.
The same stance calculation runs in reduced motion and at the animation
endpoint. All 12 engine tests passed, including the 10,000-drill solver.
Four targeted Chrome tests passed for actual 4K, interception, lofted and
moving-receiver play. The actual 4K hardware run finished three lofted
receptions with a 10.0 ms median draw submission interval and no errors.

The strict direct-16K Chrome benchmark now uses the actual browser window
and checks both the drawing buffer and physical viewport size. On the local
Windows display it exited with the expected failure receipt. WebGL allocated
the 15,360 × 8,640 scene, but the 970 × 546 drawing buffer could only show
its downsampled output. The ordinary one-clearance 16K scene benchmark
passed separately. Direct-buffer performance and scanout remain unverified.

The renderer can request a direct 16K WebGL drawing buffer when the
full-screen canvas has at least 15,360 × 8,640 physical pixels and WebGL
reports compatible limits. Local Chrome verified the smaller-display path
through three broadcast clearances with a 15,360 × 8,640 scene on a
1425 × 802 full-screen canvas. It restored actual 4K without WebGL errors.
The affected browser checks for full screen, actual 4K and unsupported 16K
passed. Direct 16K allocation, native scanout and 60 fps remain unverified.

Goal Line now offers a browser full-screen view that expands the game
layout and keeps the drill controls available. All 20 Chrome browser
checks passed, including keyboard entry and exit, a play step in full
screen and preservation of the advanced ball position on exit. Full screen
uses the existing graphics modes. Native 16K output remains unverified.

The Chrome hardware benchmark can now time the directional shadow pass
separately. On Intel Arc 140T, five heavy-turf clearances at 16K yielded
128 shadow-refresh samples, with a 1.0 ms median and 2.0 ms 95th percentile.
The existing combined timing mode passed a separate one-clearance check
with a 42.0 ms median from scene color clear through presentation. Both runs
restored 4K without WebGL errors. Shadow-map refresh savings alone cannot
close the gap to the 16.7 ms frame budget on this hardware.

The turf now uses one hardware-filtered depth comparison per shadow lookup.
In paired five-clearance Chrome runs at 16K on Intel Arc 140T, median scene
GPU time fell from 39.7 to 35.6 ms and median observed GPU completion
interval fell from 58.3 to 50.1 ms. Visible goal and player shadows remained
in the captured viewport. Both runs restored 4K without WebGL errors or
context loss. The actual 4K, camera-switching and heavy-turf browser checks
passed on the candidate. The 60 fps requirement remains open.

All 19 Goal Line browser tests passed against `dad8bde` in the existing
Firefox 159.0 cache on Windows. The suite verified an actual 3840 × 2160
WebGL drawing buffer, context recovery, saved progression through the final
drill, and the advanced-drill accessibility check at 320 px with reduced
motion. This was a headless browser check. Firefox hardware frame pacing
and native 16K presentation were not measured. GitHub `main` remained at
`2ac20c4` when the development revision was verified.

Goal Line requests antialiasing for the WebGL drawing buffer. Chrome on
Intel Arc 140T granted it, and the paired 4K broadcast captures showed
smoother rails and goal edges. Across three heavy-turf clearances per
run, median 4K draw submission was 8.3 ms before and 8.4 ms after, and
the 95th percentile moved from 8.5 to 16.8 ms. Three 16K clearances
with antialiasing enabled on the presentation canvas completed at a
50.1 ms median observed GPU completion interval. The 16K scene framebuffer
remains single-sampled. Both candidate runs completed without WebGL errors
or context loss, and the 16K run restored actual 4K.
All 19 Goal Line Chrome browser checks passed on the candidate build.

The training venue now has a connected railing behind the goal and terrain
beyond the apron. The 4K broadcast capture shows the new boundary and
horizon. Chrome on Intel Arc 140T completed three broadcast heavy-turf
clearances each at 4K and 16K without WebGL errors or context loss. Median
4K draw submission was 8.3 ms and median observed 16K GPU completion was
50.0 ms. The actual 4K and camera-switch browser tests passed. The 16K
60 fps requirement remains open.

The hardware benchmark now selects and verifies the broadcast camera.
Chrome on Intel Arc 140T completed five heavy-turf clearances per mode.
At 3840 × 2160 the median draw submission interval was 8.3 ms and the
95th percentile was 8.6 ms. At 15,360 × 8,640, median observed GPU
completion was 47.6 ms and the 95th percentile was 54.3 ms. The 16K scene
was downsampled for display and restored to 4K in the broadcast view.
Both runs finished without WebGL errors or context loss. The default
goal camera also passed one 4K clearance using the existing report path.

Escape now pauses a live feed from the sliders or toolbar and preserves
keyboard focus. Chrome passed the timed pause/resume test with focus on kick
speed and the Drill field, plus all 18 other Goal Line tests against the
same application build. The original test targeted the Camera selector,
which is disabled in its no-WebGL fixture. The corrected case passed.

All 19 Goal Line Chrome browser checks passed. The added advanced-drill
check at 320 px with reduced motion covers skip-link focus, no horizontal
overflow, clearance readiness, stable slider names and value text with
direction or units. Axe reported zero violations with the drill rules
expanded. Manual screen-reader announcements were not tested.

Two five-clearance Chrome runs at 16K on Intel Arc 140T compared the
existing turf shader with separate materials that computed goalmouth wear
only on the two stripes intersecting the wear ellipse. Median scene GPU
time was 34.1 ms with the existing shader and 34.4 ms with the two-stripe
variant. Both runs restored 4K without graphics errors or context loss.
The experiment was reverted and the baseline build hash was reproduced.

At development revision `6f39857`, two Chrome runs of five heavy-turf
clearances on Intel Arc 140T compared drawing the turf before and after
the other opaque geometry, with the sky drawn last in both runs. Delaying
turf increased median 16K scene GPU time from 34.1 to 49.6 ms and median
observed GPU completion intervals from 50.0 to 65.7 ms. Both runs restored
4K without errors or context loss. The experiment was reverted and the
baseline build reproduced its SHA256.

In paired Chrome runs of five heavy-turf clearances on Intel Arc 140T, a
nine-sample presentation filter reduced median GPU presentation time from
8.1 to 5.8 ms. Observed GPU completion intervals were 50.9 and 50.0 ms
median, and 71.4 and 61.5 ms at the 95th percentile. Both filters rendered
the scene at 15,360 × 8,640, presented at 898 × 505 and returned to 4K
without WebGL errors or context loss. Pitch markings and the goal net
remained visible in both captures, with slightly less distinct individual
net strands in the nine-sample capture. The 60 fps 16K gate remains open.
All 18 Goal Line Chrome browser checks passed on the nine-sample build.

The turf shader now constructs its tangent basis only where the existing
near-field normal map contributes. In matched Chrome runs of five heavy-turf
clearances at 15,360 × 8,640 on Intel Arc 140T, median scene GPU time fell
from 37.4 to 31.2 ms and the 95th percentile fell from 45.7 to 38.5 ms.
Both runs restored 4K without WebGL errors. The captured viewport showed
consistent turf appearance. The 16K scene still exceeds the 60 fps budget.
All 12 Goal Line engine checks and 18 Chrome browser checks passed on the
candidate, including actual 4K, context recovery and saved progression.

Separate Chrome timer-query runs on Intel Arc 140T each completed three
heavy-turf clearances at 15,360 × 8,640. Median GPU time was 34.7 ms from
scene color clear to presentation clear, 8.6 ms for the presentation pass,
and 50.1 ms in the combined run. These independent runs exclude the shadow
pass and include setup frames. The scene pass alone exceeds the frame budget
of 16.7 ms at 60 fps.

Chrome completed three aerial receptions at 4K and ten at 16K on Intel Arc
140T without WebGL errors or context loss. Frame intervals were 8.3 ms
median and 16.6 ms at the 95th percentile at 4K, and 58.2 ms median and
66.8 ms at the 95th percentile at 16K. The 16K scene rendered into a
15,360 × 8,640 buffer and was downsampled for display. It remains below the
60 fps release target.

On the `5ff76a8` local build, Chrome completed three 16K-to-4K switches.
Each 16K entry allocated one full-resolution depth renderbuffer. Switching
cameras and resizing the viewport kept the same buffer, and every return to
4K deleted it and restored a 3840 × 2160 drawing buffer without WebGL errors.

Directly attaching the 16-bit depth renderbuffer removed an extra
full-resolution depth allocation at 16K startup. Chrome on Intel Arc 140T
reported a 24-bit then a 16-bit allocation on the previous code and one
16-bit allocation on the new code. Five heavy-turf clearances kept the
15,360 × 8,640 scene buffer and returned to 4K without WebGL errors.
[CI run 44943246720](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44943246720)
also passed verification for the earlier `5bbc237` pitch-marking revision.

Three matched five-clearance heavy-turf runs at 16K compared goalmouth wear
implementations on Intel Arc 140T. Median GPU scene and presentation times
were 43.9 ms for the existing shader, 46.6 ms for a bounds check in that
shader and 48.3 ms for vertex colors on subdivided turf. All three retained
the full scene buffer without WebGL errors or context loss. The renderer
keeps the existing wear shader.

The 16K framebuffer now verifies a 16-bit depth attachment and uses a nearer
clipping plane of 1.25 m to preserve precision on the pitch. In paired
three-clearance heavy-turf trials on Intel Arc 140T, median GPU scene and
presentation time moved from 45.3 to 42.4 ms. An additional five-clearance
run completed without errors or context loss and restored the 4K buffer.

The benchmark now records draw gaps of at least 100 ms with phase of play
and browser focus or visibility events. Follow-up 4K heavy-turf runs of ten
and five clearances had 16.8 and 16.7 ms 99th-percentile intervals. The
earlier one-second gap did not recur. The longest follow-up gap was 108.1 ms
during approach, with no browser event recorded inside it.

[CI run 44941189856](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44941189856)
passed verification on `e666242`, including the repaired input tests. Its
publication job was skipped. Separately, the hardware benchmark now supports
drill 8,002 with heavy turf, a moving receiver and defensive pressure. On
Intel Arc 140T, five heavy-turf 16K clearances had a median observed GPU
completion interval of 50.1 ms and a 95th percentile of 58.6 ms. Three
heavy-turf 4K clearances retained the full drawing buffer without graphics
errors, with an 8.3 ms median submission interval and a 1,000 ms 99th
percentile. Both resolutions used the local development build.

Standard turf now uses matte Lambert lighting with the existing texture,
normal detail and shadow filter. Heavy turf keeps the specular lighting.
In three-clearance Chrome runs on Intel Arc 140T, median GPU scene and
presentation time at 15,360 × 8,640 fell from 50.5 to 47.2 ms. One earlier
trial ended when the browser closed before it could write a report.

Instancing the fixed steel and concrete training-ground pieces reduced one
4K broadcast redraw from 181 to 61 WebGL draw calls. Both views were
inspected. The new scene also completed five hardware-accelerated clearances
in the 15,360 × 8,640 scene framebuffer without WebGL errors or context loss.

[CI run 44939298561](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44939298561)
on `04d855b` passed unit, API, accessibility and fallback checks. Its rendered
gameplay step passed 47 cases and failed three Goal Line input cases. The
follow-up isolates those input checks from software rendering and advances
the gamepad fixture on an explicit clock. All three corrected input cases
and the separate actual-4K case passed locally with SwiftShader flags. The
published Goal Line entry still matches the legacy `4616eaf` page byte for
byte. The 3D build remains held from publication.

The 16K renderer now checks the GPU fence on a short timer only while a
newer frame is waiting. In paired five-clearance runs on Intel Arc 140T,
median observed completion changed from 58.3 to 51.4 ms, with a 66.8 ms
95th percentile in both. The subsequent 30-clearance timer run measured
58.1 ms median and 66.8 ms at the 95th percentile, with no WebGL errors or
context loss and successful restoration to a 3840 × 2160 drawing buffer.

Chrome 158 touch emulation at 360 × 800 verified that Goal Line fits the
viewport and can be played entirely with taps. The test triggered a missed
clearance, restarted, aimed and cleared all three balls, then verified that
drill 2 remained unlocked after reload. Physical phone input remains untested.

The packed player mesh now transfers 1.22 MB instead of 1.59 MB and uses
the same GPU attribute values as the JSON asset. All 14 Chrome gameplay
checks and five cold-load checks passed. Median WebGL readiness was 2.44 s
at simulated 20 Mbps, with the slowest run at 4.63 s.

Re-encoding the 1024 × 1024 turf diffuse and normal maps reduced their
combined transfer size from 2.66 MB to 1.18 MB. In five local Chrome 158
cold-load checks at simulated 20 Mbps and 40 ms latency, median WebGL
readiness fell from the previous run's 3,254 ms to 2,638 ms. Controls were
ready within 347 ms on all five loads.

Five cold-load checks of `d12ebc3` on headless Chrome 158 for Windows met
Goal Line's 3,000 ms actionable-controls target. A loopback static server
served the build with the browser cache disabled and a simulated 20 Mbps
connection with 40 ms latency. Controls initialized in 246–1,405 ms
(median 267 ms), and each run accepted a keyboard Hold command. WebGL
became ready in 3,203–4,364 ms (median 3,254 ms). This measures the local
development build under simulated networking.

A fixed four-sample shadow filter on the turf reduced median GPU
scene-and-presentation time from 51.7 to 48.2 ms across paired five-clearance
16K runs on Intel Arc 140T. Median observed completion intervals were
59.9 and 59.4 ms. Both runs retained the full 15,360 × 8,640 scene buffer.

The turf now uses Blinn–Phong lighting with the existing grass textures,
normal detail and shadow reception. In matched five-clearance runs at
15,360 × 8,640 on Intel Arc 140T, median GPU scene-and-presentation time
was 41.9 ms with the new material and 46.2 ms with the previous material.
Median observed completion improved from 58.3 to 50.0 ms. Both runs
completed without WebGL errors or context loss. Sustained 16K performance
remains below the release target.

An optional WebGL timer-query run on Intel Arc 140T and Chrome 158 measured
132 samples at 15,360 × 8,640 over three full clearances and setup. The GPU
interval from scene color clear through presentation draw had a 60.0 ms
median and a 69.1 ms 95th percentile, excluding the shadow pass. During play,
the browser observed GPU completion intervals of 74.8 ms median and 83.3 ms
at the 95th percentile. This points to rendering work as the main limit on
the tested GPU. The 16K release gate remains open.

All 14 Goal Line browser checks passed locally on Windows using the cached
Firefox 159.0 executable against development revision `c959bcd`. Coverage
included the measured 3840 × 2160 WebGL 2 drawing buffer, keyboard play
without WebGL, camera preference persistence and the saved final campaign
completion. This also passed the same 14 cases in Chrome. The Firefox run
used the existing cached browser and did not change the CI browser setup.

A second 10-clearance comparison tested discarding the 16K depth attachment
before presenting the color texture. On Intel Arc 140T, the median observed
completion interval was 83.1 ms with the discard and 67.1 ms with the
existing renderer. Both runs completed without WebGL errors or context loss.
The renderer keeps its existing depth attachment handling.

A 10-clearance comparison on Intel Arc 140T tested skipping the 16K scene
color clear when the sky covers the frame. The median observed completion
interval was 58.5 ms with the change and 58.4 ms with the existing clear.
The 95th percentile rose from 67.0 to 74.8 ms. The development renderer
keeps the color clear.

The full-play hardware workload now runs from the incoming feed through a
successful clearance under pressure. Chrome 158 on Intel Arc 140T finished
all 30 clearances at 15,360 × 8,640 with 1,310 observed GPU completions, a
66.6 ms median interval and a 78.8 ms 95th-percentile interval. A separate
three-clearance run retained 3840 × 2160 with an 8.3 ms median submission
interval. Both runs completed without WebGL errors or context loss.

The hardware benchmark now records 16K GPU fence observations separately
from draw submissions. Chrome 158 on Intel Arc 140T completed 30 live feeds
with 616 observed frame completions, a median observation interval of 65.5 ms
and a 95th percentile of 75 ms. A separate three-feed run retained a
3840 × 2160 drawing buffer with an 8.3 ms median submission interval.
Both runs completed without graphics errors or context loss.

Drawing the sky after opaque pitch geometry reduced 16K frame intervals in
a local comparison on Intel Arc 140T with Chrome 158. Both builds completed
10 live feeds at 15,360 × 8,640 without WebGL errors or context loss. The
median interval dropped from 60.0 to 50.0 ms and the 95th percentile from
70.1 to 60.1 ms. Both runs presented on an 898 × 505 canvas and could
switch back to a native 3840 × 2160 drawing buffer. The 16K release gate
remains open.

The development build now offers a sideline broadcast view alongside the
goal camera. The camera switch preserves the live drill state. The training
ground includes touchline dugouts and a licensed photographic sky.

**Release held under the updated owner acceptance standard.** Development
continues on the scoped branch. The ground and goal now use original turf
colour and relief textures, painted pitch markings, cylindrical goal posts,
netting and shadows. The defender now uses a CC0 human mesh and skinned rig
with initial lateral-step and clearance poses. Browser inspection of the
new character, production-quality kit and animation, and measured 16K
qualification remain open. The evidence below belongs to the earlier
gameplay candidate.

Chrome 158 on Windows with hardware-accelerated Intel Arc 140T rendered
an Apprentice drill using a complete 15,360 × 8,640 scene framebuffer on
2026-11-21 at 17:57 Europe/Berlin. WebGL reported no error or context loss
before and after the sampled play. The browser canvas displayed the result
at 898 × 505 and the rendered frame was visually inspected. The 36 submitted
frames had a 41.7 ms median interval and a 50.2 ms 95th-percentile interval.
At 17:58, the same hardware and workload retained an actual
3840 × 2160 drawing buffer and submitted 147 frames with an 8.3 ms median
interval and an 8.5 ms 95th-percentile interval.
The repeated-feed hardware check on 2026-11-21 at 18:00 Europe/Berlin held
the 16K framebuffer through all 30 feeds, with 963 frames over 39.1 seconds
of sampled live play and no WebGL errors or context loss. Median, 95th- and
99th-percentile intervals were 41.7, 83.1 and 92.0 ms. The 18:01 4K comparison
completed the same 30 feeds with 4,681 frames over 39.4 sampled seconds and
intervals of 8.3, 8.5 and 16.5 ms. These figures exclude restart gaps. The kit
and pressure opponent rendered in both modes. Native 16K display and the
production art gate remain unverified.

The 18:08 headless Chrome check with photographed turf and vertex tangents
completed 30 feeds at 15,360 × 8,640 with no reported WebGL errors or context
loss. It submitted 727 frames over 39.0 sampled seconds. Median, 95th- and
99th-percentile intervals were 58.3, 108.3 and 116.8 ms. The rendered frame
was visually inspected. This is a different browser launch mode from the
previous baseline, and the textured candidate remains below the desired
16K playability standard on the tested hardware.

The 18:11 headless retest limited turf normal-map shading by camera depth.
With the same 30-feed workload, it submitted 910 frames over 39.1 sampled
seconds at 15,360 × 8,640, with no WebGL errors or context loss. Median, 95th-
and 99th-percentile intervals were 41.7, 83.3 and 100.0 ms. The 907 × 510
presentation frame was inspected. The long frames still limit 16K playability.

The preceding renderer candidate `352d82ada323873dfaac9e399513d922637b1d5e`
passed [CI 44927480746](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44927480746):
273 JavaScript tests, 52 API tests and 75 browser checks, including the
advanced pressure interception and successful retry. Publication was skipped.

The receiving teammate is now rendered at the outlet. From Expert onward
the clearance is judged at the teammate's predicted position on arrival.
The local eight-test browser suite passed, including the moving outlet,
and the engine solver still completes all 10,000 drills. At 18:22 on
2026-11-21, the three-player scene held its measured 15,360 × 8,640 GPU
framebuffer through all 30 sampled Apprentice feeds on the Intel Arc 140T.
It submitted 732 frames over 39.4 sampled seconds with no WebGL errors or
context loss. Median and 95th-percentile intervals were 50.2 and 108.3 ms.

At 18:25 Europe/Berlin the same 30-feed test with one 16K frame in flight
retained the 15,360 × 8,640 GPU framebuffer and completed without WebGL
errors or context loss. Median, 95th- and 99th-percentile intervals were
50.1, 66.7 and 74.8 ms. A follow-up switched back to an actual
3840 × 2160 canvas successfully. The long-frame improvement does not
establish a 60 fps 16K mode.

Clearance power now affects rolling distance and the arrival time at the
opponent and receiver. An underpowered ball can stop before the outlet.
The all-drill engine solver and nine local Chrome browser tests passed,
including power adjustment and short-pass recovery, timed reception,
controller input through the browser test fixture, and actual 4K rendering.

The defender, pressing player, and receiver now use individual CC0 skin
atlases and different body proportions. Their original kits retain separate
fabric UVs. At 18:35 Europe/Berlin an Intel Arc 140T Chrome run held an
actual 3840 × 2160 drawing buffer with no WebGL errors or context loss and
the three rendered characters were inspected. All nine local Goal Line
browser tests passed on this candidate.

The clearance animation now solves the striking leg against the computed
ball-contact position while preserving segment lengths. A paused Chrome
frame with an actual 3840 × 2160 drawing buffer showed the boot and ball
meeting on a successful clearance. All nine Goal Line browser checks and
seven focused engine and leg-reach checks passed locally.

Lateral movement now uses a distance-based gait. The supporting boot stays
on the pitch while the other swings through the sidestep. Local Chrome
verification inspected a frame during the move using an actual
3840 × 2160 drawing buffer. The eight focused engine and geometry checks
passed, including a fixed support-foot check and all 10,000 drills.

After a conceded goal, the ball now reaches the first net panel it contacts
and the cords deform around that point. A Chrome run at an actual
3840 × 2160 drawing buffer captured the ball against the back net. The nine
standard browser checks and the separate visual impact check passed locally.

Skilled and higher drills now include bouncing feeds, with height carried
through the contact calculation, volley animation and net impact. The
all-drill solver completed 10,000 drills. Ten focused engine checks and ten
local Chrome browser checks passed, including waiting for a dropping feed
and then completing the clearance.

The preceding frame-queue candidate `04b8bf590cbda4fc30795c87fc3e843b88293fbe`
passed [CI 44930121559](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44930121559),
including 52 API and 78 browser checks. Publication was skipped.

The development candidate `0423d2fb8cd9a2ffdccded3c8085924a80975976`
passed [CI 44924998702](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44924998702)
on 2026-11-21 at 17:42 Europe/Berlin. Results were 272 JavaScript tests,
52 API tests and 74 browser checks (19 accessibility and reflow, 16 contract
and fallback, and 39 rendered gameplay). Goal Line coverage includes all
10,000 drills through the solver, live held-key movement with pause and reset,
early contact projection, keyboard completion, persistence, graphics fallback,
16K device-limit rejection and an actual 3840 × 2160 WebGL 2 buffer. The current
Chrome preview independently showed held movement, pausing and a successful
early clearance at 4K. The supported-hardware 16K gate and production art gate
remain open. Pages publication was skipped on the development branch.

Goal Line (game9) is integrated on main at `292d658ea79a21968fdc5668116e43abedaf4486`. The original 3D clearance drill uses timed interception, directional clearance and a saved 10,000-drill campaign. The catalog now contains fifteen local 3D implementations, one API-dependent 3D client and eight legacy 2D titles in source. Historical publication counts below describe the previous release.

- [Exact gameplay candidate CI](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44919603061) passed on 2026-11-21 at 16:44 Europe/Berlin: 271 JavaScript, 52 API and 72 browser checks (19 accessibility/reflow, 16 contract/fallback and 37 rendered gameplay). The local static build and release integrity checks passed. The engine solver completed every distinct drill through public commands.
- Chromium/SwiftShader reported a 3840 × 2160 WebGL 2 drawing buffer with GL error 0. Keyboard completion, retry, reload and graphics fallback passed. The 320px screenshot and the frame rendered with 4K mode selected were inspected from [artifact 14713497349](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/44919603061/artifacts/14713497349). Hardware frame time, physical touch and screen-reader sessions remain unverified.
- The scoped engine checkpoint `c81a00463dab6530723f2e43d1a5c9f3b0ba19e6` and playable checkpoint `292d658ea79a21968fdc5668116e43abedaf4486` were read back from GitHub. Main was fast-forwarded to the exact playable candidate and read back on 2026-11-21.
- Publication verification is pending. A post-integration public fetch still showed the old entry page and no new script. GitHub Pages settings showed the existing site uses GitHub Actions as its source, while the verification workflow had no deployment job. The release workflow stages the verified repository root and publishes it after the main-branch checks pass. Keep the previous production receipt until Pages deploys and byte comparison succeeds.

## Acceptance

The owner's current catalog target is approximately 100,000 distinct games
across all five brands. The original 2,000-game figures below remain in the
historical release records. Each title retains the meaningful difficulty and
level requirements in the brief and the current acceptance rules in `AGENTS.md`.

**In progress.** The target of **2,000 individually designed games, each with 10,000 meaningful levels**, is not delivered. This **published development milestone** converts **nine existing titles** to distinct playable 3D games. The catalog contains **24 titles: fourteen local 3D games, one API-dependent 3D client and nine legacy 2D games**. These are implementation counts, not full production qualification. Procedural levels, renamed templates and reskins are not separate games.

Full Genesis–Revelation coverage, production art/device qualification, complete EN/DE/Yoruba/Nigerian Pidgin localization and native-console releases remain unfinished. Live provider competition still requires its server-side deployment and configuration.

## Source and public state

| State | Verified revision / evidence |
| --- | --- |
| Scoped integration branch | `work/finish-games-2026-11-04` |
| Recorded gameplay release | **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** |
| Exact-candidate release gate | [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881) **SUCCESS**, completed **2026-11-04T23:46:49Z** |
| Main gameplay integration | Normal fast-forward from `09385bd8105e235f90493390fccbbe133083bd72` to `5547a5362bfb2edbddf3f922a918e05c14de6b18`, exact head read back **2026-11-04T23:47:14Z** |
| Pages publication | [Run 41936442011](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41936442011) **SUCCESS**, completed **2026-11-04T23:47:55Z**, deploy job 126946057508 |
| Public source comparison | **115/115 selected public files exactly match**, all HTTP 200, completed **2026-11-04T23:51:27Z**. [Full receipt](docs/evidence/2026-11-04-nine-games/deployment-5547a53.json) |
| Public URL | <https://hephzibahbehulahhq.github.io/AdigunGamesBank/>, confirmed redirect to **<https://adigungamesbank.hephzibahbehulah.com/>** |
| Public control/save smoke | Binary Flash completed both frames in 9 operations with 0 rejections; reload opened Mission 2. [Record](docs/evidence/2026-11-04-nine-games/verification-5547a53.json) |
| Previous public source | `b3844bff8775b509ddda6f9002726bf4ec1dc89b`; [preserved 67-file receipt](docs/evidence/2026-11-04-ark/deployment-b3844bf.json) |
| This record update | Documents the already observed release above. Its own later commit/checks do not retroactively replace that immutable release source. |

The nine converted games are **published**. The live catalog contains fourteen local 3D games, one API-dependent 3D client and nine legacy 2D titles. The original 2,000-title and broader production requirements remain **In progress**.

### Earlier publishing failures and observed recovery

The earlier 09385bd attempt built/uploaded successfully, stayed at `updating_pages`, timed out at 23:22:16Z and canceled at 23:22:17Z. Its 115-file public check had 54 mismatches; all 73 fetched paths existing in the preceding release matched b3844bf. [Failed publishing receipt](docs/evidence/2026-11-04-nine-games/publication-09385bd.json) · [Failed exact-byte comparison](docs/evidence/2026-11-04-nine-games/deployment-09385bd.json). The earlier e7c60ac documentation attempt also timed out twice. [Prior receipt](docs/evidence/2026-11-04-ark/publication-e7c60ac.json).

The later 5547a53 source published successfully through the **same host and configuration**, with reported success at 23:47:52Z and independently matched public bytes afterward. No DNS, permission, action-version or hosting change was made; no causal configuration fix is claimed. GitHub’s internal reason for the earlier stall remains unconfirmed. [Successful publication receipt](docs/evidence/2026-11-04-nine-games/publication-5547a53.json).

## Nine individual conversions

| Existing title | Playable work and numerical coverage |
| --- | --- |
| **Neon Pulse — game1** | Original 3D LED matrix; coupled three-state pulses, finite budget, target patterns, undo/hints, pause, failure/retry and saves. All **10,000 distinct boards** solved through the actual engine within budget. |
| **Circuit Rush — game2** | Original 3D conductor board; reciprocal terminals, source/loads/return, open circuits, shorts, unwanted branches and current overloads with a finite rotation budget. All **10,000 distinct topologies** solved through public commands. |
| **Volt Dodge — game4** | Original 3D rover/maze; moving sparks and swept collisions, finite time/shields, all-core collection and extraction. Independent route search completed all **10,000 distinct sectors** through the movement engine. |
| **Resistor Match — game5** | Concealed 3D component trays; exact four-band resistance/tolerance reading, persistent comparisons and finite-budget memory play. All **10,000 unique decks** completed. Keyboard navigation skips disabled trays and preserves actual focus. |
| **Capacitor Charge — game6** | Original 3D RC bench; component selection, exact exponential charge/hold/discharge, leakage, current/power/energy limits and switch rules. All **10,000 procedures** completed with independent KCL checks. Ideal resistors carry exact Ω/W captions. |
| **Binary Flash — game7** | Original 3D digital bench; separate staging/latch, serial clock, logical shifts/rotations, signed/unsigned values, parity and ordered frames under finite budgets. All **10,000 distinct missions** completed through public commands. |
| **Fuse Box — game8** | Original 3D DC cabinet; load allocation, finite breaker stock/budget, cable/supply current, operating profiles, actual trips/isolation/reset and retained repair plans. All **10,000 distinct reference configurations** complete through the numerical engine. |
| **Apex Circuit — game10** | Original closed 3D track/car; steering/throttle/brake/grip, twelve ordered gates per lap, anti-shortcut state, time/recovery penalties, step driving and saves. **10,000 distinct configurations** geometrically checked; **12 representative full races**, not 10,000 full-race playtests. |
| **Penalty Pro — game17** | Original 3D training ground; five physical shots then five player-controlled keeper dives, gravity/wind, frame/keeper collisions, explicit win/draw/loss and saves. All **10,000 campaigns** complete through **50,000 shots and 50,000 saves**. |

Every conversion includes its own game guide, assumptions, asset-rights record, numerical tests, genuine-control browser tests and equivalent commands without WebGL. Existing assets needed by other routes remain intact, including `game17/style.css` for games18–21. The official corporate artwork is unchanged. Simultaneous racing touches no longer release a held throttle after focus changes.

## Exact verification

Source **`5547a5362bfb2edbddf3f922a918e05c14de6b18`** passed [CI 41934609881](https://github.com/HephzibahBehulahHQ/AdigunGamesBank/actions/runs/41934609881), job **126940186721**, artifact **13374585946**. [Structured receipt](docs/evidence/2026-11-04-nine-games/verification-5547a53.json) · [Evidence index](docs/evidence/2026-11-04-nine-games/README.md).

| Gate | Actual result |
| --- | --- |
| `npm run check` | Passed: 24 unique routes, local links, policy/design pins, official artwork blob and JavaScript syntax |
| `npm test` | **269/269 passed**, zero failures/skips |
| `python -m pytest platform/backend/tests -q` | **52/52 passed**, one existing Starlette/httpx warning |
| `npm run build` | Clean source; **188 runtime files**, SHA-256 **`999d7a1da3bf44e7178006ff579c21d2915da6c65e53111a8641f3dd64535f93`**; [build receipt](docs/evidence/2026-11-04-nine-games/build-5547a53.json) |
| Accessibility/reflow | **18/18 passed**, no axe rule exclusions |
| Contract/graphics fallback | **15/15 passed**, fixtures explicitly test-only |
| Rendered gameplay | **36/36 passed**: genuine controls, success/failure/retry, persistence, actual 4K and advanced mobile layouts |
| Browser total | **69/69 passed**, zero unexpected, skipped or flaky results |
| Actual 4K | All nine conversions passed **3840 × 2160 WebGL 2**, GL error 0. Nine original inspected frames from 10e3b16 remain unchanged; final 5547a53 source measurements are in the receipt above. |
| Advanced mobile corrections | Circuit Rush seven-column and Binary Flash sixteen-bit fixtures passed unchanged **390px and 320px** page-width assertions; sampled controls met 44px targets. Inspected final-correction 320px captures remain in the 09385bd receipt. |
| Public source | **115/115 selected files** returned HTTP 200 and exact SHA-256 matches to 5547a53, including the catalog, shared rendering/progression, all 24 entry pages and 3D route JS/CSS. |

CI used Ubuntu 24.04 Chromium/SwiftShader. Actual raster size and browser interaction do not establish gaming-GPU frame rate. Hardware FPS/load, physical touch/gamepad and full screen-reader play are **NOT TESTED**. The 3,000 ms load target is not a measured result.

Root manually opened the published catalog and Binary Flash. Actual staging/latch and serial/parity controls commissioned its two-frame packet in **nine operations**, with **zero rejected frames**. The save feedback appeared, and reload opened **Mission 2**. This cloud browser explicitly disables WebGL; the public smoke check establishes command flow and persistence, not rendering. Earlier manual checks covered Neon/Fuse first boards, Circuit’s 100.0 mA commissioning/reload, Volt’s full-shield extraction, resistor match/focus skip and Capacitor’s charge/hold/discharge to 0.500 V. [Earlier control record](docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).

### Preserved failures and their corrections

- `8a9ff73`:197 JavaScript+52 API passed;43/44 browser passed. Penalty's exact wrapping-label locator failed; the corrected test uses the actual Graphics combobox role/name, preserving assertions/timeouts. [Receipt](docs/evidence/2026-11-04-nine-games/verification-8a9ff73.json).
- `748fb20`:251 JavaScript+52 API passed;15/16 accessibility passed. Circuit's redundant labels differed from visible spans in whitespace. Native visible names plus screen-reader terminal descriptions fixed it; no axe exclusion. [Receipt](docs/evidence/2026-11-04-nine-games/verification-748fb20.json).
- `10e3b16`: 269 JavaScript+52 API passed;67/69 browser passed, including every new 4K/control completion. Advanced Circuit/Binary page widths were 426px/519px at 390px. Shrinkable grid tracks/children and wrapped weight labels fixed both without reducing touch targets. [Measured failed-run receipt and original frames](docs/evidence/2026-11-04-nine-games/verification-10e3b16.json).
- Earlier WIP missing-guide/accessibility failures were corrected before the passing release candidate. Failed WIP candidates were never integrated to main or deployed.

## Uploaded Pages package diagnosis

The exact failed-run artifact was inspected at **2026-11-04T23:29:03Z**: ZIP CRC passed; its single tar has **386 regular files**, 60 directories and 11,386,541 bytes of contents. No symbolic/hard links, unsafe paths, special entries, duplicate names or case collisions were found. All **386/386 packaged files match 09385bd exactly**; root index, all nine game runtimes and shared assets are present. The only omitted repository file is `.github/workflows/verify.yml`. [Complete immutable-source comparison](docs/evidence/2026-11-04-nine-games/pages-artifact-09385bd.json). No inspected package defect explains the publishing stall. Internal Pages state remains unavailable.

The diagnostic follow-up was isolated on `work/pages-diagnostics-2026-11-04`, preserving the primary gate without interruption. Its exact **5547a5362bfb2edbddf3f922a918e05c14de6b18** checkpoint was read back at 23:33:09Z, then passed its full gate and was fast-forwarded into the primary branch and main. Source 0fc4f098 also independently passed all 390 checks in CI 41933617782 at 23:36:48Z.

## Checkpoints and recovery

Primary work remains on `work/finish-games-2026-11-04`. Engineering work on `work/finish-engineering-2026-11-04` is fully merged with real merge ancestry through **`c230318855d4e227e151b9d497072122b4f34136`**, read back **22:32:05Z**. Both specialist writers are frozen.

Plain Git write authentication was unavailable. The authorized connector created identical Git trees, used expected-head checks and normal fast-forwards, read back exact remote heads, and public Git fetch reconciled identical-tree local commits while preserving unstaged work. No credentials were exposed, force pushes performed or access changed.

Verified primary checkpoints on 2026-11-04 UTC: `f9a6a982` 21:44:17, `a14c4f5` 21:46:36, `148954a` 21:50:55, `3b94403` 21:55:06, `24819e4` 22:00:05, `8a9ff73` 22:04:03, `904cdc7` 22:22:12, `748fb20` 22:24:36, `10e3b16` 22:33:21 and `09385bd` 22:54:03. Frozen periods do not require empty commits. First primary changed work began 21:41:59Z; the first checkpoint met five minutes.

Engineering receipts: `7db0840` 21:59:16, `6fb58d8` 22:04:20, `e32afcd` 22:09:28, `4019851` 22:13:13, `5a466b5` 22:19:31, `c01f283` 22:22:26, `54a9797` 22:25:56, `ba62a45` 22:29:28 and `c230318` 22:32:05. Three changed-work intervals of **5m4s, 5m8s and 6m18s missed the five-minute cadence**; they are not compliant intervals. All snapshots were exactly read back and recovered.

For `09385bd`, first correction work began **22:48:01Z** (CSS 22:48:15Z); exact remote verification at **22:54:03Z** took **6m2s**, another cadence miss. An initial unbounded parallel chunk-read transfer failed at chunk 24 before any ref mutation. Reducing transfer chunks to 8,000 characters and concurrency to 8 allowed exact binary blobs/tree/commit synchronization; all 1,474,601 original PNG bytes were recovered. Recovery stayed below ten minutes. Future preparation targets three minutes to leave transfer time. The first evidence follow-up began **23:13:21Z** and was exactly read back as **81826a4a1babfee41dfd118e70e5b081e9e765ea at 23:17:00Z**, a compliant **3m39s** interval. The next failure-receipt checkpoint **0fc4f09892639a94f1bca3f1bffee9ee777f711e** was read back at 23:25:36Z; the artifact-diagnosis checkpoint **5547a5362bfb2edbddf3f922a918e05c14de6b18** at 23:33:09Z. Both remain in the integrated history. This later successful-publication record requires its own checkpoint; a locally written receipt is not claimed as already synchronized.

Unexercised concurrent-writer/interrupted-push and other policy recovery scenarios remain **NOT TESTED**. A later evidence-only commit does not retroactively change the immutable candidate receipts above.

## Remaining acceptance and external dependencies

- **Catalog:** nine existing legacy 2D conversions remain; the broader 2,000-title target is open. Level-generator coverage does not establish separate titles or 10,000 human playtests.
- **Bible:** David and Genesis 6–9 do not complete Genesis–Revelation or the requested Moses/Samson/Abimelech coverage.
- **Live AI:** API host, server-side provider credentials, active model IDs, independent judge configuration and a real Adigun AI endpoint are required. No replay-as-live substitution or client keys.
- **Native consoles:** platform-holder developer access, approved tooling/SDKs, licensing and certification are required. Browser games and the separate Godot Node2D suite are not native PlayStation releases.
- **Production:** hardware load/frame-time measurements, physical controls, complete languages, screen-reader play and production-art qualification remain open.

Policy remains **HB-AI-ENGINEERING-001 v2.0**, `d42d4e04ac6ab77ebafa1d4fccb724a4dde8d02e`; design system remains `52f01f9986d97088413ca9785bc7a2d3f2967123`. [Standards](docs/STANDARDS.md), [asset rights](ASSETS.md) and [earlier release evidence](docs/evidence/2026-11-04-ark/README.md) remain in force.

## Next bounded action

Verify the Goal Line deployment against its tested source before scoping the next individual legacy conversion. Live-AI and native-console dependencies above remain explicit. The nine-game milestone is published; full-project finish time is **unknown**, ETA **pending**.
