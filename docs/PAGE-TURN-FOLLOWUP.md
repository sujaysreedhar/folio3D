# Page dragging and sound — 2026-10-12

User-authorized extension to the initial release: drag from the page itself, preserve the custom curved 3D effect, and add page-turn sound (previously deferred).

- [x] Reproduce the restricted drag area with browser tests.
- [x] Start a turn after horizontal movement, support both directions and single-page swipes, preserve edge taps and zoomed panning, and clear grab feedback on cancellation.
- [x] Add an original synthesized paper rustle, enabled through `sound`, `setSound`, and a labelled toolbar toggle. Library default is silent; the playground enables sound after interaction. Dispose owned audio resources.
- [x] Verify drag settlement/reversal, sound activation/muting/cleanup, existing interactions and packaging in Chromium, Firefox and WebKit at desktop and touch sizes.
- [x] Inspect a captured curved drag, refresh the local demo, and record results.

No external sound files or new dependencies are required. Sound waits for browser-permitted user interaction. Flat fallback remains available.

Checks: strict type check and 16 unit tests passed; both builds passed; the complete six-project browser suite passed 240 cases with 12 skips; packed npm/plain-module consumers passed 30 cases, including declarations for the sound API. Four audio-playback cases skip because this Windows WebKit build exposes no AudioContext; unavailable-audio navigation is tested in all six configurations. Physical devices and audible quality through speakers remain unverified.

Visual evidence: `artifacts/drag/<project>/curved-page.png` and regenerated geometry frames. Inspected Chromium forward/drag, Firefox reverse and WebKit mobile drag images. The fixed camera angle shows curved sheet edges and cast shadows without clipping in these captures. The in-app demo was refreshed and a full drag and mute/unmute were exercised.

A read-only review found missing audio activation through the page input/consumer controls and a keyboard navigation race before a held drag starts. Both were reproduced by failing tests, fixed, and reviewed again with no remaining findings. CI now builds declarations before checking the demos that import the package.
