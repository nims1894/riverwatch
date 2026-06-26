# CHANGELOG

## Version 1.0 Beta — CAB-007 Shipyard Reorganization

- Reorganized project into product-oriented folders.
- Moved CSS to `css/style.css`.
- Moved JavaScript to `js/`.
- Added `docs/` for Design Doctrine, Operational Doctrine, and Investment Constitution.
- Added `archive/CAB006/` with the previous CAB-006.1 baseline ZIP.
- Removed duplicate Current Status and Recovery sections from Captain's Bridge.
- Preserved Dashboard / Boatyard / Logbook role-based spaces.
- Added Target Path display to Logbook journey bars using internal calculation.
- Improved Trim Summary with delta values and ranking.
- Applied Naval Console theme overrides and responsive refinements.

Status: Version 1.0 Beta baseline.


## Version 1.0 Beta — CAB-007.1 Eye Comfort / UX Comfort Pass

- Reduced primary text brightness by approximately 10%.
- Slightly lifted the background tone for lower contrast fatigue.
- Added `TOP` utility button next to `BACK TO INTRO`.
- Replaced Logbook journey abbreviations `T / P / V` with `Planned Course / Principal / Market Value`.
- Preserved static, calm UI policy with no animation.

Status: Eye Comfort patch ready for review.

## Version 1.0 Beta — CAB-007.2 Drydock Polish
- Reframed Trim Deck as Doctrine Compliance Panel.
- Replaced OVER/UNDER logic with SATISFIED / BUILDING / DILUTING / WITHIN CAP.
- Removed Target text label from trim bars and added clean target indicator line with triangle marker.
- Tightened Captain's Bridge note spacing and added bullet markers.
- Rebuilt Portfolio Journey as time-scaled line chart with Principal / Market Value / Planned Course.
- Updated Voyage Timeline to latest-first milestone entries with Principal, Market Value, and Planned Course values.

## CAB-007.3 Scrollbar Comfort Pass
- Portfolio Journey horizontal scrollbar restyled to match Voyage Timeline scrollbar.
- Kept horizontal scroll for time-scaled journey chart; vertical scroll remains disabled.

## CAB-008.1 Portfolio Journey Scale Patch
- Fixed Portfolio Journey X-axis range to use actual OpenSeaLogbook record dates instead of the long-term target date.
- Long-term Open Sea target remains represented in summary/progress cards.
## CAB-008.3 Trim Deck Visual Enhancement Pass
- Changed Trim Deck bar logic from ratio-based progress to doctrine-line deviation visualization.
- Current bar remains filled from the left.
- Minimum/Cap marker is fixed to a consistent local position.
- Gap/Excess is shown as 5%-point block-style deviation around the doctrine marker.
## CAB-008.3b Trim Deck Cleanup Pass
- Removed gap-side auxiliary block rendering for cleaner Trim Deck bars.
- Changed deviation block calculation to round away from zero by 5%-point units.
- Kept only the upward target triangle marker shape.
## CAB-008.3c Trim Deck Cleanup Final
- Removed remaining faint deviation block overlays from Trim Deck bars.
- Removed Trim Summary section from the Boatyard page.
- Kept the simplified target marker with a single upward triangle.
