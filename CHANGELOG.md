# RiverWatch v1.0 RC2c — CAB-014 Trim Deck Detail-Only

- Removed Trim Deck accordion toggle and summary rows.
- Restored detail stat labels.
- Detail cards remain 2-column on desktop/tablet and 1-column on mobile.


## v1.0 RC2 — CAB-011 Bridge Layout Refactoring
- Unified Health Matrix and Trim Deck toggles.
- Default collapsed overview for mobile readability.
- Removed Trim Deck label header.
- Increased text readability and aligned dashboard bridge card widths.

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

## v1.0 RC1b — CAB-009 Sea Trial UX Polish Pack

- Applied comma-based numeric formatting.
- Added collapsible Health cards and Trim Deck cards.
- Persisted collapse state with localStorage.
- Removed Trim Summary card and unused render function.
- Added Last Sync refresh button.
- Updated intro label to Version 1.0 RC1b.
- Added dashboard reload control to avoid unnecessary repeated reloads.


## v1.0 RC1c — CAB-010a Dashboard Width & Readability Correction

- Aligned top RiverWatch system bar and navigation width with the dashboard content grid.
- Restored dashboard text readability after RC1b compact layout.
- Kept Health cards collapsed by default while improving title / score / status spacing.
- Converted Trim Deck collapsed header labels from Korean to English: Asset / Current / Target / Delta / Status.
- Stabilized Trim Deck collapsed row column positions.


## RiverWatch v1.0 RC2b — CAB-013 Information Diet
- Trim Deck information density reduced for mobile readability.
- Status labels shortened.
- Detail-card duplicate labels removed.
- Boatyard mobile overflow containment improved.
- Intro philosophy restored on mobile.


## v1.0 RC2d — CAB-015 Trim Metric Semantic Labels

- Added Current / Target / Gap labels to Trim Deck detail metrics.
- Added status badge icons: SAT ✓ / BUILD ▲ / DILUTE ▼.
- Kept Trim Deck detail-only structure from CAB-014.


## v1.0 RC2e — CAB-015b Trim Metric Label Visibility Fix

- Restored visible Current / Target / Gap labels in Trim Deck detail cards.
- Added stronger CSS override for previous UI Diet label-hiding rule.


## v1.0 RC2f — CAB-016 Portfolio Journey Mobile Margin Regression Fix

- Restored mobile Portfolio Journey left-margin optimization.
- Reduced mobile SVG chart padding and prevented horizontal chart overflow.
