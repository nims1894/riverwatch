# CAB-041 CHANGELOG

- Corrected Koru branding to the approved flat spiral-wave vector symbol matching the selected app-icon concept.
- Replaced all intro/header Koru instances with the same `koru-mark.svg` asset.
- Rebuilt PWA icons from the approved Koru symbol; main symbol occupies approximately 85% of the app-icon canvas.
- USDKRW now always renders with thousands separators and exactly 2 decimal places (e.g. `1,418.80`).
- Deck/Allocation GAP now always renders with exactly 1 decimal place, including zero (e.g. `+0.0%`).
- Retained independent Voyage/River/Boat Health SVG icon set and Health score right-alignment.
- Bumped service-worker cache key to CAB041 so updated assets are refreshed on deployed PWA clients.
